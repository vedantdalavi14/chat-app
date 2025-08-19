const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: { // Changed from 'receiver' to 'receiver' for consistency
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

// This is the crucial line that exports the model correctly
module.exports = mongoose.model('Message', MessageSchema);
