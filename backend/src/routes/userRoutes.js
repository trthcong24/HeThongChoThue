const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { getProfile, updateProfile, getTransactionHistory } = require("../controllers/userController");

const router = express.Router();

router.use(requireAuth);
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.get("/transactions", getTransactionHistory);

module.exports = router;
