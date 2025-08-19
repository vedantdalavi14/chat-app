const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model

const router = express.Router();

// @route   POST /auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        // 1. Get username and password from request body
        const { username, password } = req.body;

        // 2. Check if user already exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 3. Create a new user instance
        user = new User({
            username,
            password,
        });

        // 4. Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 5. Save the user to the database
        await user.save();

        // 6. Create a JWT payload
        const payload = {
            user: {
                id: user.id,
            },
        };

        // 7. Sign the token and send it back
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' }, // Token expires in 5 hours
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /auth/login
// @desc    Login a user and get a token
router.post('/login', async (req, res) => {
    try {
        // 1. Get username and password from request body
        const { username, password } = req.body;

        // 2. Check if the user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 3. Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 4. If credentials are correct, create and return a token
        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;