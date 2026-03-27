const express = require("express");
const cors = require("cors");
const path = require("path");
const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const spaceRoutes = require("./routes/spaceRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const mapRoutes = require("./routes/mapRoutes");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/workspaces", spaceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;
