const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// SEND FRIEND REQUEST
router.post('/request/:receiverId', auth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.params;

    if (senderId === receiverId) {
      return res.status(400).json({ msg: 'Cannot send friend request to yourself.' });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ msg: 'User not found.' });

    // Already friends?
    if (sender.friends.includes(receiverId) || receiver.friends.includes(senderId)) {
      return res.status(400).json({ msg: 'Already friends.' });
    }

    // Existing request either direction
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      status: { $in: ['pending', 'accepted'] }
    });
    if (existing) {
      return res.status(400).json({ msg: 'Friend request already exists.' });
    }

    const fr = await FriendRequest.create({ sender: senderId, receiver: receiverId });

    // Emit realtime event to receiver if online
    try {
      const onlineUsers = req.app.get('onlineUsers');
      const receiverSocketId = onlineUsers.get(receiverId.toString());
      if (receiverSocketId && req.io) {
        req.io.to(receiverSocketId).emit('friend:request', { requestId: fr._id, from: senderId });
      }
    } catch (e) {
      console.error('Emit friend:request error', e.message);
    }

    res.status(201).json(fr);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ACCEPT FRIEND REQUEST
router.post('/accept/:id', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found.' });
    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ msg: 'Request already processed.' });
    }

    request.status = 'accepted';
    await request.save();

    await User.updateOne({ _id: request.sender }, { $addToSet: { friends: request.receiver } });
    await User.updateOne({ _id: request.receiver }, { $addToSet: { friends: request.sender } });

    // Emit accepted event to both users if online
    try {
      const onlineUsers = req.app.get('onlineUsers');
      if (req.io) {
        const senderSocketId = onlineUsers.get(request.sender.toString());
        const receiverSocketId = onlineUsers.get(request.receiver.toString());
        const payload = { userA: request.sender.toString(), userB: request.receiver.toString() };
        if (senderSocketId) req.io.to(senderSocketId).emit('friend:accepted', payload);
        if (receiverSocketId) req.io.to(receiverSocketId).emit('friend:accepted', payload);
      }
    } catch (e) {
      console.error('Emit friend:accepted error', e.message);
    }

    res.json({ msg: 'Friend request accepted.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// REJECT FRIEND REQUEST
router.post('/reject/:id', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found.' });
    if (request.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ msg: 'Request already processed.' });
    }
    request.status = 'rejected';
    await request.save();
    res.json({ msg: 'Friend request rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// CANCEL OUTGOING FRIEND REQUEST
router.post('/cancel/:id', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found.' });
    if (request.sender.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ msg: 'Request already processed.' });
    }
    await request.deleteOne();

    // Notify receiver if online to update UI (remove incoming pending state)
    try {
      const onlineUsers = req.app.get('onlineUsers');
      const receiverSocketId = onlineUsers.get(request.receiver.toString());
      if (receiverSocketId && req.io) {
        req.io.to(receiverSocketId).emit('friend:request:cancel', { from: request.sender.toString() });
      }
    } catch (e) {
      console.error('Emit friend:request:cancel error', e.message);
    }

    res.json({ msg: 'Friend request canceled.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// LIST FRIENDS
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username displayName avatarUrl');
    res.json(user.friends || []);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// LIST PENDING REQUESTS (incoming)
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
      .populate('sender', 'username displayName avatarUrl')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// LIST OUTGOING PENDING REQUESTS
router.get('/outgoing', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ sender: req.user.id, status: 'pending' })
      .populate('receiver', 'username displayName avatarUrl')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// DISCOVER USERS (not friends, no pending/accepted request either direction)
router.get('/discover', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find ids in existing pending/accepted requests
    const related = await FriendRequest.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: { $in: ['pending', 'accepted'] }
    }).lean();

    const blockedIds = new Set();
    related.forEach(r => {
      blockedIds.add(r.sender.toString());
      blockedIds.add(r.receiver.toString());
    });

    const me = await User.findById(userId).select('friends').lean();
    me.friends.forEach(fid => blockedIds.add(fid.toString()));
    blockedIds.add(userId);

    const discover = await User.find({ _id: { $nin: Array.from(blockedIds) } })
      .select('username displayName avatarUrl')
      .lean();

    res.json(discover);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
