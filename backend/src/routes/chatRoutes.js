const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
	getChatContacts,
	getMyRooms,
	getRoomMessages,
	sendMessage
} = require("../controllers/chatController");

const router = express.Router();

router.use(requireAuth);
router.get("/contacts", getChatContacts);
router.get("/rooms", getMyRooms);
router.get("/rooms/:roomId/messages", getRoomMessages);
router.post("/", sendMessage);

module.exports = router;
