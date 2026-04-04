const pool = require("../config/db");
const { createNotification, notifyAdmins } = require("../services/notificationService");
const { emitToAdmins, emitToUser } = require("../services/socket");
const { assertValidSlots, calculateSlotPrice } = require("../services/pricingService");
const { loadBookings } = require("../services/bookingQueryService");

function normalizeSlots(slots) {
  return (slots || []).map((slot) => ({
    startAt: slot.startAt || slot.start_time || slot.startTime,
    endAt: slot.endAt || slot.end_time || slot.endTime
  }));
}

async function createBooking(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { spaceId, workspaceId, slots, serviceIds, note } = req.body;
    const normalizedSpaceId = Number(spaceId || workspaceId);
    const normalizedSlots = normalizeSlots(slots);

    if (!normalizedSpaceId) {
      return res.status(400).json({ message: "spaceId is required" });
    }

    assertValidSlots(normalizedSlots);

    await connection.beginTransaction();

    const [spaceRows] = await connection.query(
      `SELECT id, name, pricing_unit, price_per_unit FROM spaces WHERE id = ?`,
      [normalizedSpaceId]
    );

    if (spaceRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Space not found" });
    }

    const space = spaceRows[0];

    for (const slot of normalizedSlots) {
      const [overlapRows] = await connection.query(
        `SELECT bs.id
         FROM booking_slots bs
         JOIN bookings b ON b.id = bs.booking_id
         WHERE b.space_id = ?
           AND b.status IN ('pending', 'confirmed')
           AND bs.start_at < ?
           AND bs.end_at > ?
         LIMIT 1`,
        [normalizedSpaceId, slot.endAt, slot.startAt]
      );

      if (overlapRows.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: "One or more selected time slots are already booked" });
      }
    }

    const normalizedServiceIds = [...new Set((serviceIds || []).map((id) => Number(id)).filter(Boolean))];
    let selectedServices = [];
    if (normalizedServiceIds.length > 0) {
      const placeholders = normalizedServiceIds.map(() => "?").join(", ");
      const [services] = await connection.query(
        `SELECT id, name, price, pricing_type
         FROM services
         WHERE is_active = 1 AND id IN (${placeholders})`,
        normalizedServiceIds
      );
      selectedServices = services;
    }

    let slotsTotalPrice = 0;
    const slotDetails = normalizedSlots.map((slot) => {
      const pricing = calculateSlotPrice(space.pricing_unit, space.price_per_unit, slot.startAt, slot.endAt);
      slotsTotalPrice += pricing.slotPrice;
      return {
        startAt: slot.startAt,
        endAt: slot.endAt,
        unitCount: pricing.quantity,
        slotPrice: pricing.slotPrice
      };
    });

    let servicesTotalPrice = 0;
    const bookingServiceRows = selectedServices.map((service) => {
      const quantity = service.pricing_type === "per_slot" ? slotDetails.length : 1;
      const totalPrice = Number(service.price) * quantity;
      servicesTotalPrice += totalPrice;

      return {
        serviceId: service.id,
        quantity,
        unitPrice: Number(service.price),
        totalPrice
      };
    });

    const totalPrice = slotsTotalPrice + servicesTotalPrice;

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (user_id, space_id, status, note, total_amount, service_amount)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      [userId, normalizedSpaceId, note || null, totalPrice, servicesTotalPrice]
    );

    const bookingId = bookingResult.insertId;

    for (const slotDetail of slotDetails) {
      await connection.query(
        `INSERT INTO booking_slots (booking_id, start_at, end_at, unit_count, slot_price)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingId, slotDetail.startAt, slotDetail.endAt, slotDetail.unitCount, slotDetail.slotPrice]
      );
    }

    for (const serviceRow of bookingServiceRows) {
      await connection.query(
        `INSERT INTO booking_services (booking_id, service_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [bookingId, serviceRow.serviceId, serviceRow.quantity, serviceRow.unitPrice, serviceRow.totalPrice]
      );
    }

    await connection.commit();

    const [bookings] = await connection.query(
      `SELECT b.id, b.user_id, b.total_amount, s.name AS space_name, u.full_name AS user_name
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [bookingId]
    );

    const booking = bookings[0];

    // Send notifications
    await createNotification({
      userId,
      title: "Đặt lịch thành công",
      message: `Booking #${booking.id} của bạn đã được tạo và đang chờ xác nhận.`,
      type: "booking"
    });

    await notifyAdmins({
      title: "Có booking mới",
      message: `Người dùng ${booking.user_name} vừa tạo booking #${booking.id}.`,
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
    const bookings = await loadBookings(pool, "WHERE b.user_id = ?", [req.user.id]);
    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
}

async function getMyBookingDetail(req, res, next) {
  try {
    const bookings = await loadBookings(pool, "WHERE b.id = ? AND b.user_id = ?", [req.params.id, req.user.id]);

    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json(bookings[0]);
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
      `SELECT b.id, b.user_id, s.name AS space_name, u.full_name AS user_name
       FROM bookings b
       JOIN spaces s ON s.id = b.space_id
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?`,
      [req.params.id]
    );

    const booking = bookings[0];

    await createNotification({
      userId: req.user.id,
      title: "Đã hủy booking",
      message: `Booking #${booking.id} đã được hủy.`,
      type: "booking"
    });

    await notifyAdmins({
      title: "Booking bị hủy",
      message: `Booking #${booking.id} vừa bị người dùng hủy.`,
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
