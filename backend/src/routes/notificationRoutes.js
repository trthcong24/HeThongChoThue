const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { getMyNotifications, markNotificationRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(requireAuth);
router.get("/", getMyNotifications);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
