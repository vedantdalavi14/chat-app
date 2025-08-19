const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const Message = require('./models/Message');
const profileRoutes = require('./routes/profile');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/conversations', conversationRoutes);
app.use('/profile', profileRoutes);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// --- Socket.IO Logic ---
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('user:online', (userId) => {
    console.log(`User ${userId} is online with socket ${socket.id}`);
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit('user:connected', userId);
    socket.emit('users:online', Array.from(onlineUsers.keys()));
  });

  socket.on('message:send', async (data) => {
    const { senderId, recipientId, text } = data;
    
    try {
      const newMessage = new Message({
        sender: senderId,
        receiver: recipientId,
        content: text,
      });
      const savedMessage = await newMessage.save(); // Get the full saved message
      
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        // --- CHANGE: Emit the entire saved message object ---
        io.to(recipientSocketId).emit('message:new', savedMessage);
      }
    } catch (error) {
      console.error('Error saving message to DB:', error);
    }
  });

  socket.on('typing:start', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing:started');
    }
  });

  socket.on('typing:stop', (data) => {
    const { recipientId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing:stopped');
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        socket.broadcast.emit('user:disconnected', userId);
        console.log(`User ${userId} went offline.`);
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
