const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import the auth middleware
const User = require('../models/User');

// @route   GET /users
// @desc    Get all users except the current one
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Find all users, but exclude the one who is making the request
        // Also, exclude the password field from the result
        const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;