const pool = require("../config/db");
const { getSocket, emitToAdmins, emitToUser } = require("../services/socket");
const { invalidateSpacesCache } = require("./spaceController");
const { loadBookings } = require("../services/bookingQueryService");
const { createNotification } = require("../services/notificationService");

async function getAllSpaces(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, GROUP_CONCAT(wi.image_url ORDER BY wi.id SEPARATOR '||') AS image_urls
       FROM workspaces w
       LEFT JOIN workspace_images wi ON wi.workspace_id = w.id
       GROUP BY w.id
       ORDER BY w.created_at DESC`
    );

    const data = rows.map((row) => ({
      ...row,
      images: row.image_urls ? row.image_urls.split("||") : []
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
      `INSERT INTO workspaces
        (name, type, address, capacity, price_per_hour, description, lat, lng, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        type,
        address,
        capacity,
        pricePerHour,
        description || null,
        lat || null,
        lng || null,
        status || "available"
      ]
    );

    const normalizedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.map((url) => String(url).trim()).filter(Boolean)
      : [];

    for (const imageUrl of normalizedImageUrls) {
      await connection.query(
        "INSERT INTO workspace_images (workspace_id, image_url) VALUES (?, ?)",
        [result.insertId, imageUrl]
      );
    }

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
      `UPDATE workspaces
       SET name = ?, type = ?, address = ?, capacity = ?, price_per_hour = ?,
           description = ?, lat = ?, lng = ?, status = ?
       WHERE id = ?`,
      [
        name,
        type,
        address,
        capacity,
        pricePerHour,
        description || null,
        lat || null,
        lng || null,
        status || "available",
        id
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Space not found" });
    }

    await connection.query("DELETE FROM workspace_images WHERE workspace_id = ?", [id]);

    const normalizedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.map((url) => String(url).trim()).filter(Boolean)
      : [];

    for (const imageUrl of normalizedImageUrls) {
      await connection.query(
        "INSERT INTO workspace_images (workspace_id, image_url) VALUES (?, ?)",
        [id, imageUrl]
      );
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
    const [result] = await pool.query("DELETE FROM workspaces WHERE id = ?", [req.params.id]);

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
      `SELECT id, name, email, role, phone, avatar, created_at
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
