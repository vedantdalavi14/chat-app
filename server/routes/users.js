const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message'); // Import the Message model
const FriendRequest = require('../models/FriendRequest');

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

// @route   GET /users/all
// @desc    Get ALL users with flags: isFriend, hasPendingRequest (outgoing or incoming), plus last message if friend
// @access  Private
router.get('/all', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const me = await User.findById(myId).select('friends').lean();
        const friendSet = new Set((me?.friends || []).map(id => id.toString()));

        // Gather pending requests related to me
        const relatedRequests = await FriendRequest.find({
            $or: [{ sender: myId }, { receiver: myId }],
            status: 'pending'
        }).lean();

        const pendingOutgoing = new Set();
        const pendingIncoming = new Set();
        relatedRequests.forEach(r => {
            if (r.sender.toString() === myId) pendingOutgoing.add(r.receiver.toString());
            else if (r.receiver.toString() === myId) pendingIncoming.add(r.sender.toString());
        });

        // Fetch all users except me
        const allUsers = await User.find({ _id: { $ne: myId } }).select('-password').lean();

        // Pre-fetch last messages only for friends for efficiency
        const friendIds = Array.from(friendSet);
        let lastMessagesMap = new Map();
        if (friendIds.length) {
            // For each friend get last message (N queries) - could optimize later with aggregation
            await Promise.all(friendIds.map(async fid => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { sender: myId, receiver: fid },
                        { sender: fid, receiver: myId }
                    ]
                }).sort({ createdAt: -1 }).lean();
                if (lastMessage) lastMessagesMap.set(fid, lastMessage);
            }));
        }

        const decorated = allUsers.map(u => {
            const idStr = u._id.toString();
            const isFriend = friendSet.has(idStr);
            const outgoing = pendingOutgoing.has(idStr);
            const incoming = pendingIncoming.has(idStr);
            return {
                ...u,
                isFriend,
                pendingOutgoing: outgoing,
                pendingIncoming: incoming,
                lastMessage: isFriend ? (lastMessagesMap.get(idStr) || null) : null
            };
        });

        res.json(decorated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
