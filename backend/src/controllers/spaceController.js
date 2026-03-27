const pool = require("../config/db");
const cache = require("../config/cache");

const SPACES_CACHE_KEY = "spaces:list";

async function getSpaces(req, res, next) {
  try {
    const cacheKey = `${SPACES_CACHE_KEY}:${JSON.stringify(req.query || {})}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ data: cached, source: "cache" });
    }

    const filters = [];
    const params = [];

    if (req.query.type) {
      filters.push("w.type = ?");
      params.push(req.query.type);
    }

    if (req.query.address || req.query.location) {
      filters.push("w.address LIKE ?");
      params.push(`%${req.query.address || req.query.location}%`);
    }

    if (req.query.minPrice) {
      filters.push("w.price_per_hour >= ?");
      params.push(Number(req.query.minPrice));
    }

    if (req.query.maxPrice) {
      filters.push("w.price_per_hour <= ?");
      params.push(Number(req.query.maxPrice));
    }

    if (req.query.keyword) {
      filters.push("(w.name LIKE ? OR w.description LIKE ?)");
      params.push(`%${req.query.keyword}%`, `%${req.query.keyword}%`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT w.id, w.name, w.type, w.address, w.capacity, w.price_per_hour,
              w.description, w.lat, w.lng, w.status, w.created_at,
              GROUP_CONCAT(wi.image_url ORDER BY wi.id SEPARATOR '||') AS image_urls,
              SUBSTRING_INDEX(GROUP_CONCAT(wi.image_url ORDER BY wi.id SEPARATOR '||'), '||', 1) AS thumbnail_url
       FROM workspaces w
       LEFT JOIN workspace_images wi ON wi.workspace_id = w.id
       ${whereClause}
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      params
    );

    const data = rows.map((row) => ({
      ...row,
      images: row.image_urls ? row.image_urls.split("||") : [],
      location: row.address,
      price_per_unit: row.price_per_hour,
      pricing_unit: "hour",
      latitude: row.lat,
      longitude: row.lng
    }));

    cache.set(cacheKey, data);
    return res.json({ data, source: "database" });
  } catch (error) {
    return next(error);
  }
}

async function getSpaceById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, name, type, address, capacity, price_per_hour,
              description, lat, lng, status, created_at
       FROM workspaces WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Space not found" });
    }

    // Get images for workspace
    const [images] = await pool.query(
      `SELECT id, image_url FROM workspace_images WHERE workspace_id = ?`,
      [id]
    );

    // Get services
    const [services] = await pool.query(
      `SELECT id, name, price, description, 'once' AS pricing_type FROM services ORDER BY name ASC`
    );

    // Get upcoming bookings
    const [recentSlots] = await pool.query(
      `SELECT bts.start_time AS start_at, bts.end_time AS end_at, b.status
       FROM booking_time_slots bts
       JOIN bookings b ON b.id = bts.booking_id
       WHERE b.workspace_id = ?
         AND b.status IN ('pending', 'confirmed')
         AND bts.start_time >= NOW()
       ORDER BY bts.start_time ASC
       LIMIT 20`,
      [id]
    );

    const imageList = images.map((img) => img.image_url);

    return res.json({
      ...rows[0],
      images: imageList,
      thumbnail_url: imageList[0] || null,
      location: rows[0].address,
      price_per_unit: rows[0].price_per_hour,
      pricing_unit: "hour",
      latitude: rows[0].lat,
      longitude: rows[0].lng,
      services,
      upcomingSlots: recentSlots
    });
  } catch (error) {
    return next(error);
  }
}

function invalidateSpacesCache() {
  cache.flushAll();
}

module.exports = {
  getSpaces,
  getSpaceById,
  invalidateSpacesCache
};
