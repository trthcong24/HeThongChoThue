const pool = require("../config/db");

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, phone, avatar_url, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
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

async function getFavoriteSpaces(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.type, s.location, s.capacity, s.price_per_unit, s.pricing_unit,
              s.description, s.latitude, s.longitude, s.thumbnail_url, s.created_at,
              fs.created_at AS favorited_at
       FROM favorite_spaces fs
       JOIN spaces s ON s.id = fs.space_id
       WHERE fs.user_id = ?
       ORDER BY fs.created_at DESC`,
      [req.user.id]
    );

    const data = rows.map((row) => ({
      ...row,
      images: row.thumbnail_url ? [row.thumbnail_url] : [],
      address: row.location,
      price_per_hour: row.price_per_unit,
      lat: row.latitude,
      lng: row.longitude,
      status: "available",
      is_favorite: true
    }));

    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

async function addFavoriteSpace(req, res, next) {
  try {
    const spaceId = Number(req.params.spaceId || req.body.spaceId);

    if (!spaceId) {
      return res.status(400).json({ message: "spaceId là bắt buộc" });
    }

    const [spaceRows] = await pool.query("SELECT id FROM spaces WHERE id = ?", [spaceId]);
    if (spaceRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy không gian" });
    }

    await pool.query(
      `INSERT INTO favorite_spaces (user_id, space_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [req.user.id, spaceId]
    );

    return res.status(201).json({ message: "Đã thêm vào yêu thích" });
  } catch (error) {
    return next(error);
  }
}

async function removeFavoriteSpace(req, res, next) {
  try {
    const spaceId = Number(req.params.spaceId || req.body.spaceId);

    if (!spaceId) {
      return res.status(400).json({ message: "spaceId là bắt buộc" });
    }

    const [result] = await pool.query(
      "DELETE FROM favorite_spaces WHERE user_id = ? AND space_id = ?",
      [req.user.id, spaceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không gian chưa có trong danh sách yêu thích" });
    }

    return res.json({ message: "Đã xóa khỏi yêu thích" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getTransactionHistory,
  getFavoriteSpaces,
  addFavoriteSpace,
  removeFavoriteSpace
};
