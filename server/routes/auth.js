const express = require('express');
const router = express.Router();

// @route   POST /auth/register
// @desc    Register a new user
router.post('/register', (req, res) => {
    res.send('Register route');
});

// @route   POST /auth/login
// @desc    Login a user
router.post('/login', (req, res) => {
    res.send('Login route');
});

module.exports = router;