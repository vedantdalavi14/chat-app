// server/middleware/auth.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Look for the lowercase 'authorization' header
    let token = req.header('authorization');

    // Check for the Bearer prefix and extract the token
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    // If no token, deny access
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};