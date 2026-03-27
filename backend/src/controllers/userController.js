const pool = require("../config/db");

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, phone, avatar_url, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, avatarUrl } = req.body;
    await pool.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [fullName || null, phone || null, avatarUrl || null, req.user.id]
    );

    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, phone, avatar_url, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function getTransactionHistory(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.status, b.total_amount, b.created_at, s.name AS space_name
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getTransactionHistory
};
