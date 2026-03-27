const pool = require("../config/db");
const { createNotification, notifyAdmins } = require("../services/notificationService");
const { emitToAdmins, emitToUser } = require("../services/socket");

// Generate unique booking code
function generateBookingCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BK${timestamp}${random}`;
}

// Calculate hours between two datetimes
function calculateHours(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return (end - start) / (1000 * 60 * 60);
}

async function createBooking(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { workspaceId, slots, serviceIds } = req.body;

    if (!workspaceId || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: "workspaceId and slots are required" });
    }

    // Validate slot format
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({ message: "Each slot must have startTime and endTime" });
      }
    }

    await connection.beginTransaction();

    // Get workspace info
    const [workspaceRows] = await connection.query(
      `SELECT id, name, price_per_hour FROM workspaces WHERE id = ?`,
      [workspaceId]
    );

    if (workspaceRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Workspace not found" });
    }

    const workspace = workspaceRows[0];

    // Check for overlapping bookings
    for (const slot of slots) {
      const [overlapRows] = await connection.query(
        `SELECT bts.id
         FROM booking_time_slots bts
         JOIN bookings b ON b.id = bts.booking_id
         WHERE b.workspace_id = ?
           AND b.status IN ('pending', 'confirmed')
           AND bts.start_time < ?
           AND bts.end_time > ?
         LIMIT 1`,
        [workspaceId, slot.endTime, slot.startTime]
      );

      if (overlapRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "One or more selected time slots are already booked" });
      }
    }

    // Get selected services
    const normalizedServiceIds = [...new Set((serviceIds || []).map(id => Number(id)).filter(Boolean))];
    let selectedServices = [];
    if (normalizedServiceIds.length > 0) {
      const placeholders = normalizedServiceIds.map(() => "?").join(", ");
      const [services] = await connection.query(
        `SELECT id, name, price FROM services WHERE id IN (${placeholders})`,
        normalizedServiceIds
      );
      selectedServices = services;
    }

    // Calculate total price
    let slotsTotalPrice = 0;
    const slotDetails = slots.map(slot => {
      const hours = calculateHours(slot.startTime, slot.endTime);
      const slotPrice = hours * workspace.price_per_hour;
      slotsTotalPrice += slotPrice;
      return { startTime: slot.startTime, endTime: slot.endTime, price: slotPrice };
    });

    let servicesTotalPrice = 0;
    selectedServices.forEach(service => {
      servicesTotalPrice += service.price;
    });

    const totalPrice = slotsTotalPrice + servicesTotalPrice;

    // Create booking
    const bookingCode = generateBookingCode();
    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (user_id, workspace_id, booking_code, total_price, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, workspaceId, bookingCode, totalPrice]
    );

    const bookingId = bookingResult.insertId;

    // Insert time slots
    for (const slotDetail of slotDetails) {
      await connection.query(
        `INSERT INTO booking_time_slots (booking_id, start_time, end_time)
         VALUES (?, ?, ?)`,
        [bookingId, slotDetail.startTime, slotDetail.endTime]
      );
    }

    // Insert selected services
    for (const service of selectedServices) {
      await connection.query(
        `INSERT INTO booking_services (booking_id, service_id, quantity, price)
         VALUES (?, ?, 1, ?)`,
        [bookingId, service.id, service.price]
      );
    }

    await connection.commit();

    // Load complete booking data
    const [fullBooking] = await connection.query(
      `SELECT b.*, w.name as workspace_name, u.name as user_name
       FROM bookings b
       JOIN workspaces w ON w.id = b.workspace_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [bookingId]
    );

    const booking = fullBooking[0];

    // Send notifications
    await createNotification({
      userId,
      title: "Đặt lịch thành công",
      content: `Booking #${booking.booking_code} của bạn đã được tạo và đang chờ xác nhận.`,
      type: "booking"
    });

    await notifyAdmins({
      title: "Có booking mới",
      content: `Người dùng ${booking.user_name} vừa tạo booking #${booking.booking_code}.`,
      type: "booking"
    });

    emitToAdmins("booking:created", booking);
    emitToUser(userId, "booking:created", booking);

    return res.status(201).json(booking);
  } catch (error) {
    try {
      await connection.rollback();
    } catch (e) {
      // ignore rollback error
    }
    return next(error);
  } finally {
    connection.release();
  }
}

async function getMyBookings(req, res, next) {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, w.name as workspace_name, w.address, u.name as user_name,
              GROUP_CONCAT(DISTINCT s.name) as service_names,
              COUNT(DISTINCT bts.id) as slot_count
       FROM bookings b
       JOIN workspaces w ON w.id = b.workspace_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN booking_services bs ON bs.booking_id = b.id
       LEFT JOIN services s ON s.id = bs.service_id
       LEFT JOIN booking_time_slots bts ON bts.booking_id = b.id
       WHERE b.user_id = ?
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
}

async function getMyBookingDetail(req, res, next) {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, w.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM bookings b
       JOIN workspaces w ON w.id = b.workspace_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ? AND b.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookings[0];

    // Get time slots
    const [slots] = await pool.query(
      `SELECT start_time, end_time FROM booking_time_slots WHERE booking_id = ?`,
      [req.params.id]
    );

    // Get services
    const [services] = await pool.query(
      `SELECT s.id, s.name, s.price, bs.price as selected_price
       FROM booking_services bs
       JOIN services s ON s.id = bs.service_id
       WHERE bs.booking_id = ?`,
      [req.params.id]
    );

    return res.json({
      ...booking,
      slots,
      services
    });
  } catch (error) {
    return next(error);
  }
}

async function cancelMyBooking(req, res, next) {
  try {
    const [result] = await pool.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = ? AND user_id = ? AND status != 'cancelled'`,
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Booking not found or already cancelled" });
    }

    const [bookings] = await pool.query(
      `SELECT b.*, w.name as workspace_name, u.name as user_name
       FROM bookings b
       JOIN workspaces w ON w.id = b.workspace_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [req.params.id]
    );

    const booking = bookings[0];

    await createNotification({
      userId: req.user.id,
      title: "Đã hủy booking",
      content: `Booking #${booking.booking_code} đã được hủy.`,
      type: "booking"
    });

    await notifyAdmins({
      title: "Booking bị hủy",
      content: `Booking #${booking.booking_code} vừa bị người dùng hủy.`,
      type: "booking"
    });

    emitToAdmins("booking:statusChanged", { bookingId: booking.id, status: "cancelled" });
    emitToUser(req.user.id, "booking:statusChanged", { bookingId: booking.id, status: "cancelled" });

    return res.json(booking);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getMyBookingDetail,
  cancelMyBooking
};
