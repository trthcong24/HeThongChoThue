const pool = require("../config/db");

async function getMyNotifications(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, content, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const [result] = await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification updated" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead
};
