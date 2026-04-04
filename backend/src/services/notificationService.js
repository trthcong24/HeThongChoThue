const pool = require("../config/db");
const { getSocket } = require("./socket");

async function createNotification({ userId, type, title, message, content, metadata }) {
  const normalizedMessage = message || content || "";
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, metadata_json, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, type, title, normalizedMessage, metadata ? JSON.stringify(metadata) : null]
  );

  const notification = {
    id: result.insertId,
    user_id: userId,
    type,
    title,
    message: normalizedMessage,
    is_read: 0,
    created_at: new Date().toISOString()
  };

  const io = getSocket();
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
}

async function notifyAdmins(payload) {
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  const notifications = [];

  for (const admin of admins) {
    notifications.push(createNotification({ ...payload, userId: admin.id }));
  }

  return Promise.all(notifications);
}

module.exports = {
  createNotification,
  notifyAdmins
};
