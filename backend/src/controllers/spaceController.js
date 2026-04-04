const pool = require("../config/db");
const cache = require("../config/cache");

const SPACES_CACHE_KEY = "spaces:list";

function formatSpaceRow(row) {
  return {
    ...row,
    images: row.thumbnail_url ? [row.thumbnail_url] : [],
    address: row.location,
    price_per_hour: row.price_per_unit,
    lat: row.latitude,
    lng: row.longitude,
    status: "available"
  };
}

async function withFavoriteState(spaces, userId) {
  const normalizedSpaces = (spaces || []).map((space) => ({
    ...space,
    is_favorite: Boolean(space.is_favorite)
  }));

  if (!userId || normalizedSpaces.length === 0) {
    return normalizedSpaces;
  }

  const placeholders = normalizedSpaces.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT space_id FROM favorite_spaces WHERE user_id = ? AND space_id IN (${placeholders})`,
    [userId, ...normalizedSpaces.map((space) => space.id)]
  );

  const favoriteIds = new Set(rows.map((row) => Number(row.space_id)));
  return normalizedSpaces.map((space) => ({
    ...space,
    is_favorite: favoriteIds.has(Number(space.id))
  }));
}

async function getSpaces(req, res, next) {
  try {
    const cacheKey = `${SPACES_CACHE_KEY}:${JSON.stringify(req.query || {})}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      const data = await withFavoriteState(cached, req.user?.id);
      return res.json({ data, source: "cache" });
    }

    const filters = [];
    const params = [];

    if (req.query.type) {
      filters.push("s.type = ?");
      params.push(req.query.type);
    }

    if (req.query.address || req.query.location) {
      filters.push("s.location LIKE ?");
      params.push(`%${req.query.address || req.query.location}%`);
    }

    if (req.query.minPrice) {
      filters.push("s.price_per_unit >= ?");
      params.push(Number(req.query.minPrice));
    }

    if (req.query.maxPrice) {
      filters.push("s.price_per_unit <= ?");
      params.push(Number(req.query.maxPrice));
    }

    if (req.query.keyword) {
      filters.push("(s.name LIKE ? OR s.description LIKE ?)");
      params.push(`%${req.query.keyword}%`, `%${req.query.keyword}%`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.type, s.location, s.capacity, s.price_per_unit, s.pricing_unit,
              s.description, s.latitude, s.longitude, s.thumbnail_url, s.created_at
       FROM spaces s
       ${whereClause}
       ORDER BY s.created_at DESC`,
      params
    );

    const baseData = rows.map((row) => formatSpaceRow(row));
    const data = await withFavoriteState(baseData, req.user?.id);

    cache.set(cacheKey, baseData);
    return res.json({ data, source: "database" });
  } catch (error) {
    return next(error);
  }
}

async function getSpaceById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, name, type, location, capacity, price_per_unit, pricing_unit,
              description, latitude, longitude, thumbnail_url, created_at
       FROM spaces WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy không gian" });
    }

    // Get services
    const [services] = await pool.query(
      `SELECT id, name, price, description, pricing_type
       FROM services
       WHERE is_active = 1
       ORDER BY name ASC`
    );

    // Get upcoming bookings
    const [recentSlots] = await pool.query(
      `SELECT bs.start_at, bs.end_at, b.status
       FROM booking_slots bs
       JOIN bookings b ON b.id = bs.booking_id
       WHERE b.space_id = ?
         AND b.status IN ('pending', 'confirmed')
         AND bs.start_at >= NOW()
       ORDER BY bs.start_at ASC
       LIMIT 20`,
      [id]
    );

    let isFavorite = false;
    if (req.user?.id) {
      const [favoriteRows] = await pool.query(
        `SELECT id FROM favorite_spaces WHERE user_id = ? AND space_id = ? LIMIT 1`,
        [req.user.id, id]
      );
      isFavorite = favoriteRows.length > 0;
    }

    const imageList = rows[0].thumbnail_url ? [rows[0].thumbnail_url] : [];

    return res.json({
      ...rows[0],
      images: imageList,
      thumbnail_url: imageList[0] || null,
      address: rows[0].location,
      price_per_hour: rows[0].price_per_unit,
      lat: rows[0].latitude,
      lng: rows[0].longitude,
      status: "available",
      is_favorite: isFavorite,
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
