const express = require("express");
const { getMapMarkers } = require("../controllers/mapController");

const router = express.Router();

router.get("/", getMapMarkers);

module.exports = router;
