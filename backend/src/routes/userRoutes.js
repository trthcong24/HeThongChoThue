const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  getProfile,
  updateProfile,
  getTransactionHistory,
  getFavoriteSpaces,
  addFavoriteSpace,
  removeFavoriteSpace
} = require("../controllers/userController");

const router = express.Router();

router.use(requireAuth);
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.get("/transactions", getTransactionHistory);
router.get("/favorites", getFavoriteSpaces);
router.post("/favorites/:spaceId", addFavoriteSpace);
router.delete("/favorites/:spaceId", removeFavoriteSpace);

module.exports = router;
