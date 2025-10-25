const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

// دالة مساعدة لتعبئة (Populate) بيانات آخر رسالة والمستخدمين
const populateChat = (query) => {
  return query
    .populate("users", "-password")
    .populate("latestMessage") // قد يكون null في المحادثات الجديدة
    .populate({
      path: "latestMessage.sender",
      select: "username role",
    });
  // الملاحظة: هذا الاستخدام للـ populate قد يفشل إذا لم يتم إرجاع latestMessage كـ ObjectId صالح (null/undefined)
};

// 1. GET /api/chats - جلب جميع محادثات المستخدم الحالي
router.get("/", protect, async (req, res) => {
  try {
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .sort({ updatedAt: -1 })
      // التعبئة (Populate) في سلسلة واحدة
      .populate("users", "-password")
      .populate("latestMessage")
      .exec(); // تشغيل الاستعلام

    // التعبئة المشروطة للمرسل (sender) داخل آخر رسالة
    chats = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "username role",
    });

    res.status(200).send(chats);
  } catch (error) {
    console.error("Backend Error fetching chats:", error); // 👈 ستظهر رسالة الخطأ هنا
    res.status(500).json({ message: "Error fetching chats" });
  }
});

// 2. POST /api/chats - إنشاء محادثة ثنائية جديدة أو جلب الموجودة
router.post("/", protect, async (req, res) => {
  const { userId } = req.body; // معرف المستخدم الآخر

  if (!userId) {
    return res.status(400).json({ message: "Target user ID is required" });
  }

  // البحث عن محادثة ثنائية موجودة
  let chat = await Chat.findOne({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } }, // المستخدم الحالي
      { users: { $elemMatch: { $eq: userId } } }, // المستخدم الآخر
    ],
  });

  if (chat) {
    // إذا كانت موجودة، قم بتعبئة البيانات وإرسالها
    chat = await populateChat(chat);
    return res.status(200).send(chat);
  }

  // إذا لم تكن موجودة، قم بإنشاء محادثة جديدة
  try {
    const createdChat = await Chat.create({
      chatName: "sender",
      users: [req.user._id, userId],
    });

    const fullChat = await populateChat(Chat.findOne({ _id: createdChat._id }));
    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: "Error creating chat", error });
  }
});

// 3. GET /api/chats/:chatId/messages - جلب سجل الرسائل لمحادثة معينة
router.get("/:chatId/messages", protect, async (req, res) => {
  try {
    // يجب التحقق أولاً من أن المستخدم عضو في هذه المحادثة (للتأمين)
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.users.includes(req.user._id)) {
      return res
        .status(404)
        .json({ message: "Chat not found or access denied" });
    }

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "username role") // تعبئة بيانات المرسل
      .sort({ createdAt: 1 }); // فرز من الأقدم للأحدث

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
});

// 4. GET /api/chats/users?search=... - البحث عن مستخدمين
router.get("/users", protect, async (req, res) => {
  const keyword = req.query.search
    ? {
        username: { $regex: req.query.search, $options: "i" },
      }
    : {};

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } }) // استثناء المستخدم الحالي
    .select("-password");

  res.send(users);
});

// مسارات المسؤول/الدعم
router.get(
  "/admin/users",
  protect,
  authorizeRole("admin"),
  async (req, res) => {
    // منطق جلب جميع المستخدمين
    const users = await User.find({}).select("-password");
    res.json(users);
  }
);

router.get(
  "/support/tickets",
  protect,
  authorizeRole("support", "admin"),
  (req, res) => {
    res.json({ tickets: [], message: "Support data accessed successfully." });
  }
);

module.exports = router;
