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
      return res.status(400).json({ message: "Dòng xe không hợp lệ hoặc đã ngừng hoạt động" });
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
      return res.status(400).json({ message: "Dòng xe không hợp lệ" });
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
        message: "Không thể xóa xe vì còn có người đang thuê" 
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
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    // Prevent admin from demoting themselves
    if (Number(req.params.id) === req.user.id && role !== "admin") {
      return res.status(403).json({ message: "Không thể tự hạ quyền của chính mình" });
    }

    const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.json({ message: "Đã cập nhật vai trò người dùng" });
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
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    // State-machine: only allow valid transitions
    const [[current]] = await pool.query("SELECT status, user_id FROM bookings WHERE id = ?", [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: "Không tìm thấy đặt lịch" });
    }

    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled"],
      cancelled: []
    };

    if (!validTransitions[current.status].includes(status)) {
      return res.status(409).json({
        message: `Không thể chuyển trạng thái từ "${current.status}" sang "${status}"`
      });
    }

    const [result] = await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy đặt lịch" });
    }

    const bookings = await loadBookings(pool, "WHERE b.id = ?", [req.params.id]);
    const booking = bookings[0];

    const statusLabel = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy" };

    await createNotification({
      userId: booking.user_id,
      type: "booking",
      title: "Cập nhật đặt lịch",
      message: `Đặt lịch #${booking.id} đã được cập nhật thành "${statusLabel[status] || status}".`,
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
      return res.status(400).json({ message: "Tên dòng xe là bắt buộc" });
    }

    const [exists] = await pool.query("SELECT id FROM space_types WHERE code = ? LIMIT 1", [normalizedCode]);
    if (exists.length > 0) {
      return res.status(409).json({ message: "Mã dòng xe đã tồn tại" });
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
  const connection = await pool.getConnection();

  try {
    const { code, label, description, isActive } = req.body;
    const normalizedCode = normalizeTypeCode(code || label);

    if (!label || !String(label).trim() || !normalizedCode) {
      return res.status(400).json({ message: "Mã và tên dòng xe là bắt buộc" });
    }

    const [rows] = await connection.query(
      `SELECT id, code, label
       FROM space_types
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy dòng xe" });
    }

    const current = rows[0];
    if (normalizedCode !== current.code) {
      const [exists] = await connection.query(
        `SELECT id FROM space_types WHERE code = ? AND id <> ? LIMIT 1`,
        [normalizedCode, req.params.id]
      );

      if (exists.length > 0) {
        return res.status(409).json({ message: "Mã dòng xe đã tồn tại" });
      }
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE space_types
       SET code = ?, label = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [normalizedCode, String(label).trim(), description || null, isActive === false ? 0 : 1, req.params.id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Không tìm thấy dòng xe" });
    }

    if (normalizedCode !== current.code) {
      await connection.query(
        `UPDATE spaces
         SET type = ?
         WHERE type = ?`,
        [normalizedCode, current.code]
      );
    }

    await connection.commit();

    return res.json({ message: "Đã cập nhật dòng xe" });
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

async function deleteSpaceType(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, code FROM space_types WHERE id = ? LIMIT 1", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy dòng xe" });
    }

    const typeCode = rows[0].code;
    const [[spacesUsingType]] = await pool.query("SELECT COUNT(*) AS total FROM spaces WHERE type = ?", [typeCode]);
    if (Number(spacesUsingType.total) > 0) {
      return res.status(409).json({ message: "Không thể xóa vì vẫn còn xe đang dùng dòng này" });
    }

    await pool.query("DELETE FROM space_types WHERE id = ?", [req.params.id]);
    return res.json({ message: "Đã xóa dòng xe" });
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
