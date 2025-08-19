const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth'); // Import the auth routes

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); 

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://vedantdalavi14:aTvEgGtF9mAhU9BI@chat-app.i2ptouv.mongodb.net/?retryWrites=true&w=majority&appName=chat-app')
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));


// API Routes
app.use('/auth', authRoutes); 

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));