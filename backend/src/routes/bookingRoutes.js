const express = require("express");
const {
	createBooking,
	getMyBookings,
	getMyBookingDetail,
	cancelMyBooking
} = require("../controllers/bookingController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.post("/", requireAuth, createBooking);
router.get("/mine", requireAuth, getMyBookings);
router.get("/user", requireAuth, getMyBookings);
router.get("/:id", requireAuth, getMyBookingDetail);
router.patch("/:id/cancel", requireAuth, cancelMyBooking);

module.exports = router;
