// server.js (الخادم الرئيسي)
require('dotenv').config(); 
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// استيراد النماذج والمسارات
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const app = express();
const server = http.createServer(app);

// إعداد CORS للـ API
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

app.on("/", (req, res) => {
    res.send("Hello from the server!");
})

// 1. الاتصال بـ MongoDB
mongoose.connect(process.env.DB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// 2. إعداد Socket.IO للدردشة في الوقت الفعلي
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    // ... (منطق Socket.IO كما تم إرساله سابقاً مع تحديث دالة sendMessage) ...
    // Note: You must integrate the models (Message, Chat) logic into sendMessage here.

    socket.on('joinChat', (chatId) => { socket.join(chatId); });

    socket.on('sendMessage', async (data) => {
        const { chatId, senderId, content } = data;
        if (!chatId || !senderId || !content) return;

        try {
            let newMessage = await Message.create({ sender: senderId, content, chat: chatId });
            await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });
            
            // Populate and broadcast
            newMessage = await newMessage.populate("sender", "username role"); 
            newMessage = await newMessage.populate("chat"); 
            
            io.to(chatId).emit('newMessage', newMessage);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });
});

// 3. ربط مسارات الـ API
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes); // مسارات محمية هنا

app.get('/', (req, res) => res.send('API is running...'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
