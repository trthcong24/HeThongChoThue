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

  const [userCountRows] = await pool.query("SELECT COUNT(*) AS count FROM users");
  if (userCountRows[0].count === 0) {
    const adminPassword = await bcrypt.hash("123456", 10);
    const userPassword = await bcrypt.hash("123456", 10);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES (?, ?, ?, 'admin', ?), (?, ?, ?, 'user', ?)`,
      [
        "Admin System",
        "admin@space.com",
        adminPassword,
        "0909000001",
        "Nguyen Van User",
        "user@space.com",
        userPassword,
        "0909000002"
      ]
    );
  }

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
        "Sky Hall Meeting Room",
        "meeting_room",
        "Quan 1, TP.HCM",
        40,
        450000,
        "hour",
        "https://images.unsplash.com/photo-1497366412874-3415097a27e7",
        "Phong hop hien dai, day du am thanh, man hinh LED.",
        10.776889,
        106.700806,
        "Creative Studio Loft",
        "creative_studio",
        "Quan 3, TP.HCM",
        20,
        350000,
        "hour",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
        "Khong gian chup anh, workshop nho, bo tri linh hoat.",
        10.784264,
        106.68451,
        "Coworking Riverside",
        "coworking",
        "Thu Duc, TP.HCM",
        60,
        250000,
        "day",
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36",
        "Cho ngoi linh hoat, phu hop freelancer va team nho.",
        10.841111,
        106.809998,
        "Private Executive Desk",
        "desk",
        "Binh Thanh, TP.HCM",
        8,
        180000,
        "hour",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        "Ban lam viec rieng, yên tĩnh, co nuoc uong va wifi doanh nghiep.",
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
        "Wifi toc do cao",
        50000,
        "per_booking",
        "Tang bang thong internet cao hon cho su kien quan trong.",
        "Nuoc uong",
        15000,
        "per_slot",
        "Suat nuoc tinh theo moi khung gio dat.",
        "May chieu",
        120000,
        "per_booking",
        "Phu hop cho workshop, presentation.",
        "Phong hop rieng",
        300000,
        "per_slot",
        "Nang cap khong gian rieng cho team."]
    );
  }
}

module.exports = {
  bootstrapData
};
