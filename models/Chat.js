// models/Chat.js

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    // مصفوفة من معرفات المستخدمين المشاركين في الدردشة
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // لتحديد ما إذا كانت المحادثة جماعية أم لا
    isGroupChat: {
        type: Boolean,
        default: false
    },
    // المرجع (ref) لآخر رسالة تم إرسالها في هذه المحادثة
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    // اسم المحادثة (خاص بالدردشات الجماعية)
    chatName: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);