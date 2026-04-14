const path = require("path");
const pool = require("../config/db");

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một ảnh" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    await pool.query(
      "UPDATE users SET avatar_url = ? WHERE id = ?",
      [avatarUrl, req.user.id]
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

async function getFavoriteSpaces(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.type, s.location, s.capacity, s.price_per_unit, s.pricing_unit,
              s.description, s.latitude, s.longitude, s.thumbnail_url, s.created_at,
              uf.created_at AS favorited_at
       FROM user_favorites uf
       JOIN spaces s ON s.id = uf.space_id
       WHERE uf.user_id = ?
       ORDER BY uf.created_at DESC`,
      [req.user.id]
    );

    return res.json(
      rows.map((row) => ({
        ...row,
        images: row.thumbnail_url ? [row.thumbnail_url] : [],
        address: row.location,
        price_per_hour: row.price_per_unit,
        lat: row.latitude,
        lng: row.longitude,
        status: "available",
        isFavorite: true
      }))
    );
  } catch (error) {
    return next(error);
  }
}

async function addFavoriteSpace(req, res, next) {
  try {
    const { spaceId } = req.body;
    const normalizedSpaceId = Number(spaceId);

    if (!Number.isInteger(normalizedSpaceId) || normalizedSpaceId <= 0) {
      return res.status(400).json({ message: "vehicleId không hợp lệ" });
    }

    const [spaceRows] = await pool.query("SELECT id FROM spaces WHERE id = ?", [normalizedSpaceId]);
    if (spaceRows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy xe" });
    }

    await pool.query(
      `INSERT INTO user_favorites (user_id, space_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [req.user.id, normalizedSpaceId]
    );

    return res.status(201).json({ message: "Đã thêm vào yêu thích" });
  } catch (error) {
    return next(error);
  }
}

async function removeFavoriteSpace(req, res, next) {
  try {
    const { spaceId } = req.params;
    const normalizedSpaceId = Number(spaceId);

    if (!Number.isInteger(normalizedSpaceId) || normalizedSpaceId <= 0) {
      return res.status(400).json({ message: "vehicleId không hợp lệ" });
    }

    await pool.query(
      `DELETE FROM user_favorites
       WHERE user_id = ? AND space_id = ?`,
      [req.user.id, normalizedSpaceId]
    );

    return res.json({ message: "Đã bỏ khỏi yêu thích" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadAvatar,
  getProfile,
  updateProfile,
  getTransactionHistory,
  getFavoriteSpaces,
  addFavoriteSpace,
  removeFavoriteSpace
};
