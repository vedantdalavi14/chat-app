const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    // --- NEW FIELD ---
    status: {
        type: String,
        // enum ensures the status can only be one of these values
        enum: ['sent', 'delivered', 'read'], 
        default: 'sent', // A message is 'sent' by default
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
