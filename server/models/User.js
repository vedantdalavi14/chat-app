const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    // --- NEW FIELD ---
    displayName: {
        type: String,
        default: '',
    },
    password: {
        type: String,
        required: true,
    },
    onlineStatus: {
        type: Boolean,
        default: false,
    },
    avatarUrl: {
        type: String,
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
