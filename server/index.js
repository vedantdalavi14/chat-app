const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const profileRoutes = require('./routes/profile');
const Message = require('./models/Message');

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

  socket.on('user:online', async (userId) => {
    console.log(`User ${userId} is online with socket ${socket.id}`);
    onlineUsers.set(userId, socket.id);

    // --- CHANGE: Notify other users that this user is now online ---
    socket.broadcast.emit('user:connected', userId);
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // --- NEW: Update messages to 'delivered' and notify senders ---
    try {
        // Find all messages sent to this user that are still in 'sent' status
        const pendingMessages = await Message.find({
            receiver: userId,
            status: 'sent',
        });

        if (pendingMessages.length > 0) {
            // Update all found messages to 'delivered'
            await Message.updateMany(
                { receiver: userId, status: 'sent' },
                { $set: { status: 'delivered' } }
            );

            // Notify each sender that their messages have been delivered
            pendingMessages.forEach(msg => {
                const senderSocketId = onlineUsers.get(msg.sender.toString());
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messages:delivered', { to: userId });
                }
            });
        }
    } catch (error) {
        console.error('Error updating messages to delivered:', error);
    }
  });

  socket.on('message:send', async (data) => {
    const { senderId, recipientId, text } = data;
    
    try {
      const newMessage = new Message({
        sender: senderId,
        receiver: recipientId,
        content: text,
        // --- CHANGE: Set status based on whether the recipient is online ---
        status: onlineUsers.has(recipientId) ? 'delivered' : 'sent',
      });
      const savedMessage = await newMessage.save();
      
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        // Send the new message to the recipient
        io.to(recipientSocketId).emit('message:new', savedMessage);
      }
      
      // Also send the message back to the sender so they can see its status
      socket.emit('message:sent', savedMessage);

    } catch (error) {
      console.error('Error saving message to DB:', error);
    }
  });

  // --- NEW: Handle Read Receipts ---
  socket.on('chat:read', async (data) => {
    const { readerId, senderId } = data;
    try {
        // Update all messages from the sender to the reader to 'read'
        await Message.updateMany(
            { sender: senderId, receiver: readerId, status: { $ne: 'read' } },
            { $set: { status: 'read' } }
        );

        // Notify the original sender that their messages have been read
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit('messages:read', { conversationPartnerId: readerId });
        }
    } catch (error) {
        console.error('Error updating messages to read:', error);
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
