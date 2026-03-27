async function loadBookings(executor, whereClause = "", params = []) {
  const [bookings] = await executor.query(
    `SELECT b.id, b.user_id, b.space_id, b.status, b.note, b.total_amount, b.service_amount, b.created_at,
            u.full_name AS user_name, u.email AS user_email,
            s.name AS space_name, s.location AS space_location, s.type AS space_type,
            s.pricing_unit, s.price_per_unit
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     JOIN spaces s ON s.id = b.space_id
     ${whereClause}
     ORDER BY b.created_at DESC`,
    params
  );

  if (bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const placeholders = bookingIds.map(() => "?").join(", ");

  const [slots] = await executor.query(
    `SELECT id, booking_id, start_at, end_at, slot_price, unit_count
     FROM booking_slots
     WHERE booking_id IN (${placeholders})
     ORDER BY start_at ASC`,
    bookingIds
  );

  const [services] = await executor.query(
    `SELECT bs.booking_id, bs.service_id, bs.quantity, bs.unit_price, bs.total_price,
            s.name, s.pricing_type
     FROM booking_services bs
     JOIN services s ON s.id = bs.service_id
     WHERE bs.booking_id IN (${placeholders})
     ORDER BY s.name ASC`,
    bookingIds
  );

  return bookings.map((booking) => ({
    ...booking,
    slots: slots.filter((slot) => slot.booking_id === booking.id),
    services: services.filter((service) => service.booking_id === booking.id)
  }));
}

module.exports = {
  loadBookings
};
