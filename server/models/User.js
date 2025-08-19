const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    onlineStatus: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// This is the crucial line that exports the model
module.exports = mongoose.model('User', UserSchema);