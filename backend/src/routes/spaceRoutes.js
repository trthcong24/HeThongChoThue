const express = require("express");
const { attachUserIfPresent } = require("../middlewares/auth");
const { getSpaces, getSpaceById } = require("../controllers/spaceController");

const router = express.Router();

router.get("/", attachUserIfPresent, getSpaces);
router.get("/:id", attachUserIfPresent, getSpaceById);

module.exports = router;
