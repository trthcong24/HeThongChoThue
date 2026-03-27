const pool = require("../config/db");

async function getMapMarkers(req, res, next) {
  try {
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
