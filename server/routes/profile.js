const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const bcrypt = require('bcryptjs');

// --- Multer Configuration ---
// Store in memory to process with sharp before saving
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

// @route   GET /profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- NEW ROUTE ---
// @route   PUT /profile/name
// @desc    Update user's display name
// @access  Private
router.put('/name', auth, async (req, res) => {
    try {
        const { displayName } = req.body;
        if (!displayName || displayName.trim() === '') {
            return res.status(400).json({ msg: 'Display name cannot be empty.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { displayName: displayName } },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   PUT /profile/avatar
// @desc    Upload or update user avatar
// @access  Private
router.put('/avatar', [auth, upload.single('avatar')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded.' });
    }

    const filename = `avatar-${req.user.id}-${Date.now()}.jpeg`;
    const filepath = path.join('public/uploads', filename);

    // Process image with sharp
    await sharp(req.file.buffer)
      .resize(200, 200) // Resize to 200x200 pixels
      .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
      .toFile(filepath);

    const avatarUrl = `http://192.168.1.4:5000/public/uploads/${filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { avatarUrl: avatarUrl } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /profile
// @desc    Delete user account and all associated data
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const { password } = req.body;

    // 1. Find the user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // 2. Check if the provided password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Delete all messages sent or received by the user
    await Message.deleteMany({ $or: [{ sender: req.user.id }, { receiver: req.user.id }] });

    // 4. Delete the user account
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: 'Your account has been permanently deleted.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
