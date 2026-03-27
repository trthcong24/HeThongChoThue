const express = require("express");
const { getSpaces, getSpaceById } = require("../controllers/spaceController");

const router = express.Router();

router.get("/", getSpaces);
router.get("/:id", getSpaceById);

module.exports = router;
