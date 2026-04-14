const pool = require("../config/db");

function parseRentalCode(value) {
  if (!value) {
    return null;
  }

  const input = String(value).trim();
  const match = input.match(/^RENT-(\d+)$/i);

  if (match) {
    return Number(match[1]);
  }

  const numeric = Number(input);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  return null;
}

async function getMapMarkers(req, res, next) {
  try {
    const bookingId = parseRentalCode(req.query.rentalCode);

    if (req.query.rentalCode && !bookingId) {
      return res.status(400).json({ message: "Mã thuê xe không hợp lệ" });
    }

    if (bookingId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.name, s.type, s.location, s.latitude, s.longitude, s.thumbnail_url,
                b.id AS booking_id
         FROM bookings b
         JOIN spaces s ON s.id = b.space_id
         WHERE b.id = ?
           AND s.latitude IS NOT NULL
           AND s.longitude IS NOT NULL`,
        [bookingId]
      );

      return res.json(
        rows.map((item) => ({
          ...item,
          rental_code: `RENT-${item.booking_id}`
        }))
      );
    }

    const [rows] = await pool.query(
      `SELECT id, name, type, location, latitude, longitude, thumbnail_url
       FROM spaces
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMapMarkers
};
