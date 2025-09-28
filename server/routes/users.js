const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message'); // Import the Message model

// @route   GET /users
// @desc    Get all FRIENDS and the last message exchanged with each
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Find current user's friends list
        const me = await User.findById(req.user.id).select('friends').lean();
        const friendIds = me?.friends || [];

        if (friendIds.length === 0) {
            return res.json([]);
        }

        // 1. Find all friend users
        const users = await User.find({ _id: { $in: friendIds } }).select('-password').lean();

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
