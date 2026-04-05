const express = require("express");
const { requireAuth } = require("../middlewares/auth");
<<<<<<< Updated upstream
const { getProfile, updateProfile, getTransactionHistory } = require("../controllers/userController");
=======
const upload = require("../middlewares/upload");
const {
  uploadAvatar,
  getProfile,
  updateProfile,
  getTransactionHistory,
  getFavoriteSpaces,
  addFavoriteSpace,
  removeFavoriteSpace
} = require("../controllers/userController");
>>>>>>> Stashed changes

const router = express.Router();

router.use(requireAuth);

// Upload avatar with error handling
router.post("/avatar", (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Lỗi tải ảnh" });
    }
    next();
  });
}, uploadAvatar);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.get("/transactions", getTransactionHistory);

module.exports = router;
