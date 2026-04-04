const pool = require("../config/db");
const { getSocket, emitToAdmins, emitToUser } = require("../services/socket");
const { invalidateSpacesCache } = require("./spaceController");
const { loadBookings } = require("../services/bookingQueryService");
const { createNotification } = require("../services/notificationService");

async function getAllSpaces(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, type, location, capacity, price_per_unit, pricing_unit,
              thumbnail_url, description, latitude, longitude, created_at
       FROM spaces
       ORDER BY created_at DESC`
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
    const [result] = await pool.query("DELETE FROM services WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ message: "Service deleted" });
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
  uploadSpaceImage
};
