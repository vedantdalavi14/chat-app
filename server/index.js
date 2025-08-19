const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const User = require('./models/User'); // Import User model for status updates
const Message = require('./models/Message'); // Import Message model to save chats
const conversationRoutes = require('./routes/conversations');

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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/conversations', conversationRoutes);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// --- Socket.IO Logic ---
const onlineUsers = new Map(); // To map userId to socketId

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  // When a user comes online, they send their userId
  socket.on('user:online', (userId) => {
    console.log(`User ${userId} is online with socket ${socket.id}`);
    onlineUsers.set(userId, socket.id);
  });

  // When a user sends a message
  socket.on('message:send', async (data) => {
    const { senderId, recipientId, text } = data;
    console.log(`Message from ${senderId} to ${recipientId}: ${text}`);
    
    // Save the message to the database
    try {
      const newMessage = new Message({
        sender: senderId,
        receiver: recipientId,
        content: text,
      });
      await newMessage.save();
    } catch (error) {
      console.error('Error saving message to DB:', error);
    }
    
    // --- NEW DEBUG LOGS ---
    console.log('Current online users:', onlineUsers);
    const recipientSocketId = onlineUsers.get(recipientId);
    console.log(`Trying to find socket for recipient ${recipientId}. Found: ${recipientSocketId}`);
    // --------------------

    if (recipientSocketId) {
      // If the recipient is online, send the message directly to them
      io.to(recipientSocketId).emit('message:new', {
        senderId,
        text,
      });
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // Remove the user from the online list
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} went offline.`);
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
