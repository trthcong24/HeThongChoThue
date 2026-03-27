const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
	getChatContacts,
	getOrCreateConversation,
	getConversation,
	sendMessage,
	getUnreadCount
} = require("../controllers/chatController");

const router = express.Router();

router.use(requireAuth);
router.get("/contacts", getChatContacts);
router.post("/create", getOrCreateConversation);
router.get("/:receiverId", getConversation);
router.post("/send", sendMessage);
router.get("/unread/count", getUnreadCount);

module.exports = router;
