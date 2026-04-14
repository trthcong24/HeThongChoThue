const express = require("express");
const {
  getAllSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
  getAllUsers,
  updateUserRole,
  getAllBookings,
  updateBookingStatus,
  getAllServices,
  createService,
  updateService,
  deleteService,
  uploadSpaceImage,
  getDashboardSummary,
  getSpaceTypes,
  createSpaceType,
  updateSpaceType,
  deleteSpaceType
} = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard-summary", getDashboardSummary);

router.get("/spaces", getAllSpaces);
router.post("/spaces", createSpace);
router.post("/spaces/upload-image", upload.single("image"), uploadSpaceImage);
router.put("/spaces/:id", updateSpace);
router.delete("/spaces/:id", deleteSpace);
router.get("/vehicles", getAllSpaces);
router.post("/vehicles", createSpace);
router.post("/vehicles/upload-image", upload.single("image"), uploadSpaceImage);
router.put("/vehicles/:id", updateSpace);
router.delete("/vehicles/:id", deleteSpace);

router.get("/space-types", getSpaceTypes);
router.post("/space-types", createSpaceType);
router.put("/space-types/:id", updateSpaceType);
router.delete("/space-types/:id", deleteSpaceType);

router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);

router.get("/bookings", getAllBookings);
router.patch("/bookings/:id/status", updateBookingStatus);

router.get("/services", getAllServices);
router.post("/services", createService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

module.exports = router;
