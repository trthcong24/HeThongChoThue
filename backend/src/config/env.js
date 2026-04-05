const dotenv = require("dotenv");

dotenv.config();

const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: clientOrigins[0] || "http://localhost:5173",
  clientOrigins,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "space_rental"
  },
  jwtSecret: process.env.JWT_SECRET || "change_me",
  cacheTtl: Number(process.env.CACHE_TTL_SECONDS || 60),
  reminderLeadMinutes: Number(process.env.REMINDER_LEAD_MINUTES || 30)
};
