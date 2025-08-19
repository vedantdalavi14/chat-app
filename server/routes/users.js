const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message'); // Import the Message model

// @route   GET /users
// @desc    Get all users and the last message exchanged with each
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // 1. Find all users except the current one
        const users = await User.find({ _id: { $ne: req.user.id } }).select('-password').lean();

        // 2. For each user, find the last message exchanged with the logged-in user
        const usersWithLastMessage = await Promise.all(
            users.map(async (user) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { sender: req.user.id, receiver: user._id },
                        { sender: user._id, receiver: req.user.id },
                    ],
                })
                .sort({ createdAt: -1 }) // Get the most recent message
                .lean();

                return {
                    ...user,
                    lastMessage: lastMessage || null, // Attach the last message or null if none exists
                };
            })
        );

        res.json(usersWithLastMessage);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
