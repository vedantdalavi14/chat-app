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
        const friendIds = (me?.friends || []).map(id => id.toString());
        const friendSet = new Set(friendIds);

        // Pending requests
        const relatedRequests = await FriendRequest.find({
            $or: [{ sender: myId }, { receiver: myId }],
            status: 'pending'
        }).lean();
        const pendingOutgoing = new Map(); // receiverId -> requestId
        const pendingIncoming = new Map(); // senderId -> requestId
        relatedRequests.forEach(r => {
            if (r.sender.toString() === myId) pendingOutgoing.set(r.receiver.toString(), r._id.toString());
            else if (r.receiver.toString() === myId) pendingIncoming.set(r.sender.toString(), r._id.toString());
        });

        // Aggregation to get last message per friend
        let lastMessagesMap = new Map();
        if (friendIds.length) {
            const lastMessages = await Message.aggregate([
                { $match: { $or: friendIds.map(fid => ({ sender: { $in: [myId, fid] }, receiver: { $in: [myId, fid] } })) } },
                { $sort: { createdAt: -1 } },
                { $project: { sender: 1, receiver: 1, content: 1, createdAt: 1, status: 1 } },
            ]);
            // Keep first occurrence per friend
            lastMessages.forEach(m => {
                const otherId = m.sender.toString() === myId ? m.receiver.toString() : m.sender.toString();
                if (!lastMessagesMap.has(otherId)) lastMessagesMap.set(otherId, m);
            });
        }

        const allUsers = await User.find({ _id: { $ne: myId } }).select('-password').lean();
        const decorated = allUsers.map(u => {
            const idStr = u._id.toString();
            const isFriend = friendSet.has(idStr);
            return {
                ...u,
                isFriend,
                pendingOutgoing: pendingOutgoing.has(idStr),
                pendingIncoming: pendingIncoming.has(idStr),
                pendingOutgoingRequestId: pendingOutgoing.get(idStr) || null,
                pendingIncomingRequestId: pendingIncoming.get(idStr) || null,
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
