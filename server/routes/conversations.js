// NOTE: This file must be named 'conversations.js' (lowercase 'c').
// The import in your index.js file should look for this exact name.
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // We need this to protect the route
const Message = require('../models/Message'); // Model names are Capitalized by convention

// @route   GET /conversations/:otherUserId
// @desc    Get all messages between the logged-in user and another user
// @access  Private
router.get('/:otherUserId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    // Find all messages where the sender/receiver pair matches the two users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    }).sort({ createdAt: 'asc' }); // Sort by oldest first

    res.json(messages);
  } catch (err)
    {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
