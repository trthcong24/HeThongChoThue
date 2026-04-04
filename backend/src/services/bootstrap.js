const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function ensureColumn(tableName, columnName, definition) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (rows.length === 0) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function bootstrapData() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await ensureColumn("users", "phone", "VARCHAR(30) NULL");
  await ensureColumn("users", "avatar_url", "VARCHAR(500) NULL");
  await ensureColumn("users", "full_name", "VARCHAR(150) NULL");
  await ensureColumn("users", "password_hash", "VARCHAR(255) NULL");

  const [legacyNameColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'name'`
  );
  if (legacyNameColumn.length > 0) {
    await pool.query(
      `UPDATE users
       SET full_name = CASE
         WHEN full_name IS NULL OR full_name = '' THEN name
         ELSE full_name
       END`
    );
  }

  const [legacyPasswordColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'password'`
  );
  if (legacyPasswordColumn.length > 0) {
    await pool.query(
      `UPDATE users
       SET password_hash = CASE
         WHEN password_hash IS NULL OR password_hash = '' THEN password
         ELSE password_hash
       END`
    );
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS spaces (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(100) NOT NULL DEFAULT 'meeting_room',
      location VARCHAR(255) NOT NULL,
      capacity INT NOT NULL,
      price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
      pricing_unit ENUM('hour', 'day') NOT NULL DEFAULT 'hour',
      thumbnail_url VARCHAR(500) NULL,
      description TEXT NULL,
      latitude DECIMAL(10,7) NULL,
      longitude DECIMAL(10,7) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await ensureColumn("spaces", "type", "VARCHAR(100) NOT NULL DEFAULT 'meeting_room'");
  await ensureColumn("spaces", "price_per_unit", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("spaces", "pricing_unit", "ENUM('hour', 'day') NOT NULL DEFAULT 'hour'");
  await ensureColumn("spaces", "latitude", "DECIMAL(10,7) NULL");
  await ensureColumn("spaces", "longitude", "DECIMAL(10,7) NULL");

  const [pricePerHourColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'spaces'
       AND COLUMN_NAME = 'price_per_hour'`
  );

  if (pricePerHourColumn.length > 0) {
    await pool.query(
      `UPDATE spaces
       SET price_per_unit = CASE WHEN price_per_unit = 0 THEN price_per_hour ELSE price_per_unit END`
    );
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      pricing_type ENUM('per_booking', 'per_slot') NOT NULL DEFAULT 'per_booking',
      description TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await ensureColumn("services", "pricing_type", "ENUM('per_booking', 'per_slot') NOT NULL DEFAULT 'per_booking'");
  await ensureColumn("services", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      space_id INT NOT NULL,
      status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
      note VARCHAR(500) NULL,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      service_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_bookings_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
    )`
  );

  await ensureColumn("bookings", "total_amount", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("bookings", "service_amount", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("bookings", "note", "VARCHAR(500) NULL");
  await ensureColumn("bookings", "space_id", "INT NULL");

  const [workspaceIdColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME = 'workspace_id'`
  );
  if (workspaceIdColumn.length > 0) {
    await pool.query(
      `UPDATE bookings
       SET space_id = CASE
         WHEN space_id IS NULL THEN workspace_id
         ELSE space_id
       END`
    );
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS booking_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      start_at DATETIME NOT NULL,
      end_at DATETIME NOT NULL,
      unit_count INT NOT NULL DEFAULT 1,
      slot_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      reminder_sent_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking_slots_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )`
  );

  await ensureColumn("booking_slots", "unit_count", "INT NOT NULL DEFAULT 1");
  await ensureColumn("booking_slots", "slot_price", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("booking_slots", "reminder_sent_at", "DATETIME NULL");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS booking_services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      service_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking_services_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_booking_services_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )`
  );

  await ensureColumn("booking_services", "unit_price", "DECIMAL(12,2) NOT NULL DEFAULT 0");
  await ensureColumn("booking_services", "total_price", "DECIMAL(12,2) NOT NULL DEFAULT 0");

  await pool.query(
    `CREATE TABLE IF NOT EXISTS favorite_spaces (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      space_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_favorite_space (user_id, space_id),
      CONSTRAINT fk_favorite_spaces_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_favorite_spaces_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
    )`
  );

  const [legacyBookingServicePriceColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'booking_services'
       AND COLUMN_NAME = 'price'`
  );
  if (legacyBookingServicePriceColumn.length > 0) {
    await pool.query(
      `UPDATE booking_services
       SET unit_price = CASE WHEN unit_price = 0 THEN price ELSE unit_price END,
           total_price = CASE WHEN total_price = 0 THEN price * COALESCE(quantity, 1) ELSE total_price END`
    );
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_type ENUM('direct', 'booking') NOT NULL,
      direct_key VARCHAR(100) NULL UNIQUE,
      booking_id INT NULL UNIQUE,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_chat_rooms_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_chat_rooms_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_room_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_room_user (room_id, user_id),
      CONSTRAINT fk_chat_room_members_room FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      CONSTRAINT fk_chat_room_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      sender_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_chat_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      CONSTRAINT fk_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      metadata_json JSON NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await ensureColumn("notifications", "message", "TEXT NULL");
  await ensureColumn("notifications", "metadata_json", "JSON NULL");

  const [legacyContentColumn] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'notifications'
       AND COLUMN_NAME = 'content'`
  );
  if (legacyContentColumn.length > 0) {
    await pool.query(
      `UPDATE notifications
       SET message = CASE
         WHEN message IS NULL OR message = '' THEN content
         ELSE message
       END`
    );
  }

  const adminPassword = await bcrypt.hash("123456", 10);
  const userPassword = await bcrypt.hash("123456", 10);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, phone)
     VALUES (?, ?, ?, 'admin', ?)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       password_hash = VALUES(password_hash),
       role = 'admin',
       phone = COALESCE(phone, VALUES(phone))`,
    ["Quản trị hệ thống", "admin@space.com", adminPassword, "0909000001"]
  );

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, phone)
     VALUES (?, ?, ?, 'user', ?)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       password_hash = VALUES(password_hash),
       role = 'user',
       phone = COALESCE(phone, VALUES(phone))`,
    ["Nguyễn Văn User", "user@space.com", userPassword, "0909000002"]
  );

  const [spaceCountRows] = await pool.query("SELECT COUNT(*) AS count FROM spaces");
  if (spaceCountRows[0].count === 0) {
    await pool.query(
      `INSERT INTO spaces
        (name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url, description, latitude, longitude)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "Phòng họp Sky Hall",
        "meeting_room",
        "Quận 1, TP.HCM",
        40,
        450000,
        "hour",
        "https://images.unsplash.com/photo-1497366412874-3415097a27e7",
        "Phòng họp hiện đại, đầy đủ âm thanh và màn hình LED.",
        10.776889,
        106.700806,
        "Studio sáng tạo Loft",
        "creative_studio",
        "Quận 3, TP.HCM",
        20,
        350000,
        "hour",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
        "Không gian chụp ảnh, workshop nhỏ, bố trí linh hoạt.",
        10.784264,
        106.68451,
        "Coworking ven sông",
        "coworking",
        "Thủ Đức, TP.HCM",
        60,
        250000,
        "day",
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
        "Chỗ ngồi linh hoạt, phù hợp freelancer và team nhỏ.",
        10.841111,
        106.809998,
        "Bàn làm việc riêng cao cấp",
        "desk",
        "Bình Thạnh, TP.HCM",
        8,
        180000,
        "hour",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        "Bàn làm việc riêng, yên tĩnh, có nước uống và Wi‑Fi doanh nghiệp.",
        10.805889,
        106.717529
      ]
    );
  }

  const [serviceCountRows] = await pool.query("SELECT COUNT(*) AS count FROM services");
  if (serviceCountRows[0].count === 0) {
    await pool.query(
      `INSERT INTO services (name, price, pricing_type, description, is_active)
       VALUES
        (?, ?, ?, ?, 1),
        (?, ?, ?, ?, 1),
        (?, ?, ?, ?, 1),
        (?, ?, ?, ?, 1)`,
      [
        "WiFi tốc độ cao",
        50000,
        "per_booking",
        "Tăng băng thông internet cao hơn cho sự kiện quan trọng.",
        "Nước uống",
        15000,
        "per_slot",
        "Suất nước tính theo mỗi khung giờ đặt.",
        "Máy chiếu",
        120000,
        "per_booking",
        "Phù hợp cho workshop, thuyết trình.",
        "Phòng họp riêng",
        300000,
        "per_slot",
        "Nâng cấp không gian riêng cho team."
      ]
    );
  }

  await pool.query(
    `UPDATE users
     SET full_name = CASE
       WHEN email = 'admin@space.com' THEN 'Quản trị hệ thống'
       WHEN email = 'user@space.com' THEN 'Nguyễn Văn User'
       ELSE full_name
     END
     WHERE email IN ('admin@space.com', 'user@space.com')`
  );

  await pool.query(
    `UPDATE spaces
     SET name = 'Phòng họp Sky Hall',
         location = 'Quận 1, TP.HCM',
         description = 'Phòng họp hiện đại, đầy đủ âm thanh và màn hình LED.'
     WHERE thumbnail_url = 'https://images.unsplash.com/photo-1497366412874-3415097a27e7'`
  );

  await pool.query(
    `UPDATE spaces
     SET name = 'Studio sáng tạo Loft',
         location = 'Quận 3, TP.HCM',
         description = 'Không gian chụp ảnh, workshop nhỏ, bố trí linh hoạt.'
     WHERE thumbnail_url = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'`
  );

  await pool.query(
    `UPDATE spaces
     SET name = 'Coworking ven sông',
         location = 'Thủ Đức, TP.HCM',
         description = 'Chỗ ngồi linh hoạt, phù hợp freelancer và team nhỏ.'
     WHERE thumbnail_url = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36'`
  );

  await pool.query(
    `UPDATE spaces
     SET name = 'Bàn làm việc điều hành',
         location = 'Bình Thạnh, TP.HCM',
         description = 'Bàn làm việc riêng, yên tĩnh, có nước uống và Wi‑Fi doanh nghiệp.'
     WHERE thumbnail_url = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72'`
  );

  await pool.query(
    `UPDATE services
     SET name = CASE id
       WHEN 1 THEN 'WiFi tốc độ cao'
       WHEN 2 THEN 'Nước uống'
       WHEN 3 THEN 'Máy chiếu'
       WHEN 4 THEN 'Phòng họp riêng'
       ELSE name
     END,
     description = CASE id
       WHEN 1 THEN 'Tăng băng thông internet cao hơn cho sự kiện quan trọng.'
       WHEN 2 THEN 'Suất nước tính theo mỗi khung giờ đặt.'
       WHEN 3 THEN 'Phù hợp cho workshop, thuyết trình.'
       WHEN 4 THEN 'Nâng cấp không gian riêng cho team.'
       ELSE description
     END
     WHERE id IN (1, 2, 3, 4)`
  );
}

module.exports = {
  bootstrapData
};
