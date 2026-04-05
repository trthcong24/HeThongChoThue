const pool = require("../config/db");
const { getSocket, emitToAdmins, emitToUser } = require("../services/socket");
const { invalidateSpacesCache } = require("./spaceController");
const { loadBookings } = require("../services/bookingQueryService");
const { createNotification } = require("../services/notificationService");

function normalizeTypeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function getAllSpaces(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.type, st.label AS type_label, s.location, s.capacity, s.price_per_unit, s.pricing_unit,
              s.thumbnail_url, s.description, s.latitude, s.longitude, s.created_at
       FROM spaces s
       LEFT JOIN space_types st ON st.code = s.type
        ORDER BY s.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      address: row.location,
      price_per_hour: row.price_per_unit,
      lat: row.latitude,
      lng: row.longitude,
      status: "available",
      images: row.thumbnail_url ? [row.thumbnail_url] : []
    }));
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

async function createSpace(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const {
      name,
      type,
      address,
      capacity,
      pricePerHour,
      description,
      lat,
      lng,
      status,
      imageUrls
    } = req.body;

    if (!name || !type || !address || !capacity || !pricePerHour) {
      return res.status(400).json({
        message: "name, type, address, capacity, pricePerHour are required"
      });
    }

    const [validTypes] = await connection.query("SELECT code FROM space_types WHERE code = ? AND is_active = 1 LIMIT 1", [type]);
    if (validTypes.length === 0) {
      return res.status(400).json({ message: "Loại không gian không hợp lệ hoặc đã ngừng hoạt động" });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO spaces
        (name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url, description, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, 'hour', ?, ?, ?, ?)`,
      [
        name,
        type,
        address,
        capacity,
        pricePerHour,
        Array.isArray(imageUrls) ? (imageUrls.find((url) => String(url).trim()) || null) : null,
        description || null,
        lat || null,
        lng || null
      ]
    );

    await connection.commit();

    invalidateSpacesCache();
    const io = getSocket();
    if (io) {
      io.emit("space:changed", { action: "create", id: result.insertId });
    }
    emitToAdmins("space:changed", { action: "create", id: result.insertId });

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // no-op
    }
    return next(error);
  } finally {
    connection.release();
  }
}

async function updateSpace(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const {
      name,
      type,
      address,
      capacity,
      pricePerHour,
      description,
      lat,
      lng,
      status,
      imageUrls
    } = req.body;

    const [validTypes] = await connection.query("SELECT code FROM space_types WHERE code = ? LIMIT 1", [type]);
    if (validTypes.length === 0) {
      return res.status(400).json({ message: "Loại không gian không hợp lệ" });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE spaces
       SET name = ?, type = ?, location = ?, capacity = ?, price_per_unit = ?,
           thumbnail_url = ?, description = ?, latitude = ?, longitude = ?
       WHERE id = ?`,
      [
        name,
        type,
        address,
        capacity,
        pricePerHour,
        Array.isArray(imageUrls) ? (imageUrls.find((url) => String(url).trim()) || null) : null,
        description || null,
        lat || null,
        lng || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Space not found" });
    }

    await connection.commit();

    invalidateSpacesCache();
    const io = getSocket();
    if (io) {
      io.emit("space:changed", { action: "update", id: Number(id) });
    }
    emitToAdmins("space:changed", { action: "update", id: Number(id) });

    return res.json({ message: "Space updated" });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // no-op
    }
    return next(error);
  } finally {
    connection.release();
  }
}

async function deleteSpace(req, res, next) {
  try {
    // Check if space has any active bookings
    const [[bookingCount]] = await pool.query(
      `SELECT COUNT(*) AS total FROM bookings 
       WHERE space_id = ? AND status IN ('pending', 'confirmed')`,
      [req.params.id]
    );

    if (bookingCount.total > 0) {
      return res.status(409).json({ 
        message: "Không thể xóa không gian vì còn có người đang thuê" 
      });
    }

    const [result] = await pool.query("DELETE FROM spaces WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Space not found" });
    }

    invalidateSpacesCache();
    const io = getSocket();
    if (io) {
      io.emit("space:changed", { action: "delete", id: Number(req.params.id) });
    }
    emitToAdmins("space:changed", { action: "delete", id: Number(req.params.id) });

    return res.json({ message: "Space deleted" });
  } catch (error) {
    return next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, phone, avatar_url, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User role updated" });
  } catch (error) {
    return next(error);
  }
}

async function getAllBookings(req, res, next) {
  try {
    const bookings = await loadBookings(pool);
    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [result] = await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookings = await loadBookings(pool, "WHERE b.id = ?", [req.params.id]);
    const booking = bookings[0];

    await createNotification({
      userId: booking.user_id,
      type: "booking",
      title: "Cap nhat booking",
      message: `Booking #${booking.id} da duoc cap nhat thanh ${status}.`,
      metadata: { bookingId: booking.id, status }
    });

    emitToAdmins("booking:statusChanged", { bookingId: Number(req.params.id), status });
    emitToUser(booking.user_id, "booking:statusChanged", { bookingId: Number(req.params.id), status });

    return res.json(booking);
  } catch (error) {
    return next(error);
  }
}

async function getAllServices(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT * FROM services ORDER BY created_at DESC");
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function createService(req, res, next) {
  try {
    const { name, price, pricingType, description, isActive } = req.body;

    if (!name || !price || !pricingType) {
      return res.status(400).json({ message: "name, price, pricingType are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO services (name, price, pricing_type, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, price, pricingType, description || null, isActive === false ? 0 : 1]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (error) {
    return next(error);
  }
}

async function updateService(req, res, next) {
  try {
    const { name, price, pricingType, description, isActive } = req.body;
    const [result] = await pool.query(
      `UPDATE services
       SET name = ?, price = ?, pricing_type = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name, price, pricingType, description || null, isActive === false ? 0 : 1, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ message: "Service updated" });
  } catch (error) {
    return next(error);
  }
}

async function deleteService(req, res, next) {
  try {
    // Check if service is used in any bookings
    const [[usageCount]] = await pool.query(
      `SELECT COUNT(*) AS total FROM booking_services 
       WHERE service_id = ?`,
      [req.params.id]
    );

    if (usageCount.total > 0) {
      return res.status(409).json({ 
        message: "Không thể xóa dịch vụ vì đã được sử dụng trong đặt lịch" 
      });
    }

    const [result] = await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ message: "Service deleted" });
  } catch (error) {
    return next(error);
  }
}

async function getDashboardSummary(req, res, next) {
  try {
    const [[usersCount]] = await pool.query("SELECT COUNT(*) AS total FROM users");
    const [[spacesCount]] = await pool.query("SELECT COUNT(*) AS total FROM spaces");
    const [[bookingsCount]] = await pool.query("SELECT COUNT(*) AS total FROM bookings");
    const [[revenueSummary]] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM bookings
       WHERE status = 'confirmed'`
    );

    const [bookingsByStatus] = await pool.query(
      `SELECT status, COUNT(*) AS total
       FROM bookings
       GROUP BY status`
    );

    const [spaceDistribution] = await pool.query(
      `SELECT s.type, COALESCE(st.label, s.type) AS type_label, COUNT(*) AS total
       FROM spaces s
       LEFT JOIN space_types st ON st.code = s.type
       GROUP BY s.type, st.label
       ORDER BY total DESC`
    );

    const [monthlyRevenue] = await pool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(total_amount), 0) AS total
       FROM bookings
       WHERE status = 'confirmed'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    return res.json({
      totals: {
        users: Number(usersCount.total),
        spaces: Number(spacesCount.total),
        bookings: Number(bookingsCount.total),
        confirmedRevenue: Number(revenueSummary.total)
      },
      bookingsByStatus,
      spaceDistribution,
      monthlyRevenue
    });
  } catch (error) {
    return next(error);
  }
}

async function getSpaceTypes(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "1";
    const [rows] = await pool.query(
      `SELECT st.id, st.code, st.label, st.description, st.is_active, st.created_at,
              COUNT(s.id) AS spaces_count
       FROM space_types st
       LEFT JOIN spaces s ON s.type = st.code
       ${includeInactive ? "" : "WHERE st.is_active = 1"}
       GROUP BY st.id, st.code, st.label, st.description, st.is_active, st.created_at
       ORDER BY st.created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

async function createSpaceType(req, res, next) {
  try {
    const { code, label, description, isActive } = req.body;
    const normalizedCode = normalizeTypeCode(code || label);

    if (!label || !normalizedCode) {
      return res.status(400).json({ message: "Tên loại không gian là bắt buộc" });
    }

    const [exists] = await pool.query("SELECT id FROM space_types WHERE code = ? LIMIT 1", [normalizedCode]);
    if (exists.length > 0) {
      return res.status(409).json({ message: "Mã loại không gian đã tồn tại" });
    }

    const [result] = await pool.query(
      `INSERT INTO space_types (code, label, description, is_active)
       VALUES (?, ?, ?, ?)`,
      [normalizedCode, String(label).trim(), description || null, isActive === false ? 0 : 1]
    );

    return res.status(201).json({ id: result.insertId, code: normalizedCode });
  } catch (error) {
    return next(error);
  }
}

async function updateSpaceType(req, res, next) {
  try {
    const { label, description, isActive } = req.body;

    if (!label || !String(label).trim()) {
      return res.status(400).json({ message: "Tên loại không gian là bắt buộc" });
    }

    const [result] = await pool.query(
      `UPDATE space_types
       SET label = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [String(label).trim(), description || null, isActive === false ? 0 : 1, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy loại không gian" });
    }

    return res.json({ message: "Đã cập nhật loại không gian" });
  } catch (error) {
    return next(error);
  }
}

async function deleteSpaceType(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, code FROM space_types WHERE id = ? LIMIT 1", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy loại không gian" });
    }

    const typeCode = rows[0].code;
    const [[spacesUsingType]] = await pool.query("SELECT COUNT(*) AS total FROM spaces WHERE type = ?", [typeCode]);
    if (Number(spacesUsingType.total) > 0) {
      return res.status(409).json({ message: "Không thể xóa vì vẫn còn không gian đang dùng loại này" });
    }

    await pool.query("DELETE FROM space_types WHERE id = ?", [req.params.id]);
    return res.json({ message: "Đã xóa loại không gian" });
  } catch (error) {
    return next(error);
  }
}

function uploadSpaceImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  return res.status(201).json({ url });
}

module.exports = {
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
};
