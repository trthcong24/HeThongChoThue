const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
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
