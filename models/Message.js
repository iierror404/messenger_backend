// models/Message.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // ربط بالرسائل: المرجع (ref) لنموذج المستخدم
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // ربط بالمحادثة: المرجع (ref) لنموذج المحادثة
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);