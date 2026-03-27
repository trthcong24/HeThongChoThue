# Backend SQL Queries & Database References Analysis

## Summary
This document contains a comprehensive analysis of all SQL queries and database operations found in the backend/src directory. The database uses a relational MySQL schema with 9 main tables.

---

## 1. [services/bootstrap.js](backend/src/services/bootstrap.js)

### Database Operations
- CREATE TABLE (multiple)
- ALTER TABLE
- INSERT INTO
- SELECT (schema introspection)

### Tables Referenced & Columns
**users**
- Columns: `id`, `full_name`, `email`, `password_hash`, `role`, `created_at`, `phone`, `avatar_url`
- Operations: CREATE, INSERT, ALTER (add phone, avatar_url)

**spaces**
- Columns: `id`, `name`, `type`, `location`, `capacity`, `price_per_unit`, `pricing_unit`, `thumbnail_url`, `description`, `latitude`, `longitude`, `created_at`
- Operations: CREATE, ALTER (add type, price_per_unit, pricing_unit, latitude, longitude)

**services**
- Columns: `id`, `name`, `price`, `pricing_type`, `description`, `is_active`, `created_at`
- Operations: CREATE, INSERT

**bookings**
- Columns: `id`, `user_id`, `space_id`, `status`, `note`, `total_amount`, `service_amount`, `created_at`
- Operations: CREATE, ALTER (add total_amount, service_amount)
- Foreign Keys: `user_id` → users(id), `space_id` → spaces(id)

**booking_slots**
- Columns: `id`, `booking_id`, `start_at`, `end_at`, `unit_count`, `slot_price`, `reminder_sent_at`, `created_at`
- Operations: CREATE
- Foreign Keys: `booking_id` → bookings(id)

**booking_services**
- Columns: `id`, `booking_id`, `service_id`, `quantity`, `unit_price`, `total_price`, `created_at`
- Operations: CREATE
- Foreign Keys: `booking_id` → bookings(id), `service_id` → services(id)

**chat_rooms**
- Columns: `id`, `room_type`, `direct_key`, `booking_id`, `created_by`, `created_at`
- Operations: CREATE
- Foreign Keys: `booking_id` → bookings(id), `created_by` → users(id)

**chat_room_members**
- Columns: `id`, `room_id`, `user_id`, `created_at`
- Operations: CREATE
- Foreign Keys: `room_id` → chat_rooms(id), `user_id` → users(id)

**chat_messages**
- Columns: `id`, `room_id`, `sender_id`, `content`, `created_at`
- Operations: CREATE
- Foreign Keys: `room_id` → chat_rooms(id), `sender_id` → users(id)

**notifications**
- Columns: `id`, `user_id`, `type`, `title`, `message`, `metadata_json`, `is_read`, `created_at`
- Operations: CREATE
- Foreign Keys: `user_id` → users(id)

### Sample Queries
```sql
-- Check column existence
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?

-- Seed data insertion
INSERT INTO users (full_name, email, password_hash, role, phone)
VALUES (?, ?, ?, 'admin', ?), (?, ?, ?, 'user', ?)

-- Insert spaces
INSERT INTO spaces (name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url, description, latitude, longitude)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

---

## 2. [services/reminderScheduler.js](backend/src/services/reminderScheduler.js)

### Database Operations
- SELECT (with JOINs)
- UPDATE

### Tables Referenced & Columns
**booking_slots**
- Columns Used: `id`, `start_at`, `reminder_sent_at`

**bookings**
- Columns Used: `id`, `user_id`, `status`

**spaces**
- Columns Used: `id`, `name` (AS space_name)

### Sample Queries
```sql
-- Fetch upcoming reminders
SELECT bs.id, bs.start_at, b.user_id, s.name AS space_name
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
JOIN spaces s ON s.id = b.space_id
WHERE b.status = 'confirmed'
  AND bs.reminder_sent_at IS NULL
  AND bs.start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MINUTE)

-- Mark reminder as sent
UPDATE booking_slots SET reminder_sent_at = NOW() WHERE id = ?
```

---

## 3. [services/notificationService.js](backend/src/services/notificationService.js)

### Database Operations
- INSERT INTO
- SELECT

### Tables Referenced & Columns
**notifications**
- Columns Used: `user_id`, `type`, `title`, `message`, `metadata_json`, `is_read`

**users**
- Columns Used: `id`, `role`

### Sample Queries
```sql
-- Create notification
INSERT INTO notifications (user_id, type, title, message, metadata_json, is_read)
VALUES (?, ?, ?, ?, ?, 0)

-- Get admin users
SELECT id FROM users WHERE role = 'admin'
```

---

## 4. [services/bookingQueryService.js](backend/src/services/bookingQueryService.js)

### Database Operations
- SELECT (multiple with JOINs)
- ORDER BY, IN clause

### Tables Referenced & Columns
**bookings**
- Columns: `id`, `user_id`, `space_id`, `status`, `note`, `total_amount`, `service_amount`, `created_at`

**users**
- Columns: `id`, `full_name` (AS user_name), `email` (AS user_email)

**spaces**
- Columns: `id`, `name` (AS space_name), `location` (AS space_location), `type` (AS space_type), `pricing_unit`, `price_per_unit`

**booking_slots**
- Columns: `id`, `booking_id`, `start_at`, `end_at`, `slot_price`, `unit_count`

**booking_services**
- Columns: `booking_id`, `service_id`, `quantity`, `unit_price`, `total_price`

**services**
- Columns: `id`, `name`, `pricing_type`

### Sample Queries
```sql
-- Load bookings with details
SELECT b.id, b.user_id, b.space_id, b.status, b.note, b.total_amount, b.service_amount, b.created_at,
       u.full_name AS user_name, u.email AS user_email,
       s.name AS space_name, s.location AS space_location, s.type AS space_type,
       s.pricing_unit, s.price_per_unit
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN spaces s ON s.id = b.space_id
ORDER BY b.created_at DESC

-- Load booking slots
SELECT id, booking_id, start_at, end_at, slot_price, unit_count
FROM booking_slots
WHERE booking_id IN (...)
ORDER BY start_at ASC

-- Load booking services
SELECT bs.booking_id, bs.service_id, bs.quantity, bs.unit_price, bs.total_price, s.name, s.pricing_type
FROM booking_services bs
JOIN services s ON s.id = bs.service_id
WHERE bs.booking_id IN (...)
ORDER BY s.name ASC
```

---

## 5. [services/pricingService.js](backend/src/services/pricingService.js)

### Database Operations
- None (utility functions only)

### Functions
- `assertValidSlots()` - validates booking time ranges
- `calculateSlotPrice()` - calculates quantity and price based on pricing_unit

---

## 6. [controllers/authController.js](backend/src/controllers/authController.js)

### Database Operations
- SELECT
- INSERT INTO

### Tables Referenced & Columns
**users**
- Columns: `id`, `email`, `full_name`, `password_hash`, `role`

### Sample Queries
```sql
-- Check email exists
SELECT id FROM users WHERE email = ?

-- Register user
INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'user')

-- Login user
SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?
```

---

## 7. [controllers/adminController.js](backend/src/controllers/adminController.js)

### Database Operations
- SELECT *
- INSERT INTO
- UPDATE
- DELETE
- ORDER BY

### Tables Referenced & Columns
**spaces**
- Columns: All columns (SELECT *)
- Operations: SELECT, INSERT, UPDATE, DELETE

**users**
- Columns: `id`, `full_name`, `email`, `role`, `phone`, `avatar_url`, `created_at`
- Operations: SELECT, UPDATE

**bookings**
- Columns: `status`
- Operations: UPDATE

**services**
- Columns: All columns (SELECT *)
- Operations: SELECT, INSERT, UPDATE, DELETE

### Sample Queries
```sql
-- Get all spaces
SELECT * FROM spaces ORDER BY created_at DESC

-- Create space
INSERT INTO spaces (name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url, description, latitude, longitude)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

-- Update space
UPDATE spaces
SET name = ?, type = ?, location = ?, capacity = ?, price_per_unit = ?, pricing_unit = ?,
    thumbnail_url = ?, description = ?, latitude = ?, longitude = ?
WHERE id = ?

-- Delete space
DELETE FROM spaces WHERE id = ?

-- Get all users
SELECT id, full_name, email, role, phone, avatar_url, created_at FROM users ORDER BY created_at DESC

-- Update user role
UPDATE users SET role = ? WHERE id = ?

-- Update booking status
UPDATE bookings SET status = ? WHERE id = ?

-- Get all services
SELECT * FROM services ORDER BY created_at DESC

-- Create service
INSERT INTO services (name, price, pricing_type, description, is_active)
VALUES (?, ?, ?, ?, ?)

-- Update service
UPDATE services
SET name = ?, price = ?, pricing_type = ?, description = ?, is_active = ?
WHERE id = ?

-- Delete service
DELETE FROM services WHERE id = ?
```

---

## 8. [controllers/userController.js](backend/src/controllers/userController.js)

### Database Operations
- SELECT
- UPDATE

### Tables Referenced & Columns
**users**
- Columns: `id`, `full_name`, `email`, `role`, `phone`, `avatar_url`, `created_at`

**bookings**
- Columns: `id`, `status`, `total_amount`, `created_at`, `user_id`

**spaces**
- Columns: `id`, `name` (AS space_name)

### Sample Queries
```sql
-- Get profile
SELECT id, full_name, email, role, phone, avatar_url, created_at FROM users WHERE id = ?

-- Update profile
UPDATE users
SET full_name = COALESCE(?, full_name),
    phone = COALESCE(?, phone),
    avatar_url = COALESCE(?, avatar_url)
WHERE id = ?

-- Get transaction history
SELECT b.id, b.status, b.total_amount, b.created_at, s.name AS space_name
FROM bookings b
JOIN spaces s ON s.id = b.space_id
WHERE b.user_id = ?
ORDER BY b.created_at DESC
```

---

## 9. [controllers/bookingController.js](backend/src/controllers/bookingController.js)

### Database Operations
- SELECT (with JOINs, LIMIT, WHERE clauses)
- INSERT INTO
- UPDATE
- Transaction (BEGIN, COMMIT, ROLLBACK)

### Tables Referenced & Columns
**spaces**
- Columns: `id`, `name`, `type`, `price_per_unit`, `pricing_unit`

**bookings**
- Columns: `id`, `user_id`, `space_id`, `status`, `note`, `total_amount`, `service_amount`

**booking_slots**
- Columns: `id`, `start_at`, `end_at`, `booking_id`

**services**
- Columns: `id`, `name`, `price`, `pricing_type`, `is_active`

**booking_services**
- Columns: `booking_id`, `service_id`, `quantity`, `unit_price`, `total_price`

### Sample Queries
```sql
-- Check space exists and get pricing
SELECT id, name, type, price_per_unit, pricing_unit FROM spaces WHERE id = ?

-- Check for overlaps
SELECT bs.id
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
WHERE b.space_id = ?
  AND b.status IN ('pending', 'confirmed')
  AND bs.start_at < ?
  AND bs.end_at > ?
LIMIT 1

-- Get active services
SELECT id, name, price, pricing_type
FROM services
WHERE id IN (...) AND is_active = 1

-- Create booking
INSERT INTO bookings (user_id, space_id, status, note, total_amount, service_amount)
VALUES (?, ?, 'pending', ?, ?, ?)

-- Create booking slot
INSERT INTO booking_slots (booking_id, start_at, end_at, unit_count, slot_price)
VALUES (?, ?, ?, ?, ?)

-- Create booking service
INSERT INTO booking_services (booking_id, service_id, quantity, unit_price, total_price)
VALUES (?, ?, ?, ?, ?)

-- Cancel booking
UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status != 'cancelled'
```

---

## 10. [controllers/chatController.js](backend/src/controllers/chatController.js)

### Database Operations
- SELECT (with JOINs, GROUP BY, ORDER BY, LIMIT)
- INSERT INTO
- Multiple LIMIT clauses

### Tables Referenced & Columns
**chat_rooms**
- Columns: `id`, `room_type`, `booking_id`, `direct_key`, `created_by`, `created_at`

**chat_room_members**
- Columns: `room_id`, `user_id`

**bookings**
- Columns: `id`, `user_id`, `status`

**chat_messages**
- Columns: `id`, `room_id`, `sender_id`, `content`, `created_at`

**users**
- Columns: `id`, `full_name`, `email`, `role`

### Sample Queries
```sql
-- Check existing booking room
SELECT id, room_type, booking_id FROM chat_rooms WHERE booking_id = ? LIMIT 1

-- Get booking user
SELECT user_id FROM bookings WHERE id = ?

-- Create chat room
INSERT INTO chat_rooms (room_type, booking_id, created_by) VALUES ('booking', ?, ?)

-- Add room member
INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)

-- Check direct chat exists
SELECT id, room_type, booking_id FROM chat_rooms WHERE direct_key = ? LIMIT 1

-- Create direct chat
INSERT INTO chat_rooms (room_type, direct_key, created_by) VALUES ('direct', ?, ?)

-- Add multiple members
INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?), (?, ?)

-- Get my chat rooms
SELECT cr.id, cr.room_type, cr.booking_id, cr.created_at,
       GROUP_CONCAT(DISTINCT CASE WHEN cm2.user_id <> ? THEN u.full_name END SEPARATOR ', ') AS peer_name,
       (SELECT content FROM chat_messages latest_message
        WHERE latest_message.room_id = cr.id
        ORDER BY latest_message.created_at DESC, latest_message.id DESC
        LIMIT 1) AS last_message
FROM chat_rooms cr
JOIN chat_room_members cm ON cm.room_id = cr.id AND cm.user_id = ?
LEFT JOIN chat_room_members cm2 ON cm2.room_id = cr.id
LEFT JOIN users u ON u.id = cm2.user_id
GROUP BY cr.id
ORDER BY cr.created_at DESC

-- Get chat contacts (admin)
SELECT id, full_name, email, role FROM users
WHERE id <> ? ORDER BY role DESC, full_name ASC

-- Get chat contacts (user)
SELECT id, full_name, email, role FROM users
WHERE role = 'admin' ORDER BY full_name ASC

-- Check room membership
SELECT room_id FROM chat_room_members WHERE room_id = ? AND user_id = ? LIMIT 1

-- Get room messages
SELECT cm.id, cm.room_id, cm.sender_id, cm.content, cm.created_at, u.full_name AS sender_name
FROM chat_messages cm
JOIN users u ON u.id = cm.sender_id
WHERE cm.room_id = ?
ORDER BY cm.created_at ASC

-- Post message
INSERT INTO chat_messages (room_id, sender_id, content) VALUES (?, ?, ?)

-- Get posted message
SELECT cm.id, cm.room_id, cm.sender_id, cm.content, cm.created_at, u.full_name AS sender_name
FROM chat_messages cm
JOIN users u ON u.id = cm.sender_id
WHERE cm.id = ?

-- Get room members
SELECT user_id FROM chat_room_members WHERE room_id = ?
```

---

## 11. [controllers/notificationController.js](backend/src/controllers/notificationController.js)

### Database Operations
- SELECT
- UPDATE

### Tables Referenced & Columns
**notifications**
- Columns: `id`, `type`, `title`, `message`, `metadata_json`, `is_read`, `created_at`, `user_id`

### Sample Queries
```sql
-- Get my notifications
SELECT id, type, title, message, metadata_json, is_read, created_at
FROM notifications
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 100

-- Mark notification read
UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
```

---

## 12. [controllers/spaceController.js](backend/src/controllers/spaceController.js)

### Database Operations
- SELECT (with WHERE, LIKE, ORDER BY, LIMIT)
- JOIN queries

### Tables Referenced & Columns
**spaces**
- Columns: `id`, `name`, `type`, `location`, `capacity`, `price_per_unit`, `pricing_unit`, `thumbnail_url`, `description`, `latitude`, `longitude`, `created_at`

**booking_slots**
- Columns: `start_at`, `end_at`

**bookings**
- Columns: `id`, `status`, `space_id`

**services**
- Columns: `id`, `name`, `price`, `pricing_type`, `description`, `is_active`

### Sample Queries
```sql
-- Get spaces with filters
SELECT s.id, s.name, s.type, s.location, s.capacity, s.price_per_unit, s.pricing_unit,
       s.thumbnail_url, s.description, s.latitude, s.longitude, s.created_at
FROM spaces s
WHERE [filters based on query parameters]
ORDER BY s.created_at DESC

-- Filter conditions applied:
- s.type = ?
- s.location LIKE ?
- s.price_per_unit >= ?
- s.price_per_unit <= ?
- (s.name LIKE ? OR s.description LIKE ?)

-- Get space by ID
SELECT id, name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url,
       description, latitude, longitude, created_at
FROM spaces WHERE id = ?

-- Get active services
SELECT id, name, price, pricing_type, description
FROM services
WHERE is_active = 1
ORDER BY name ASC

-- Get upcoming slots
SELECT bs.start_at, bs.end_at, b.status
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
WHERE b.space_id = ?
  AND b.status IN ('pending', 'confirmed')
  AND bs.start_at >= NOW()
ORDER BY bs.start_at ASC
LIMIT 20
```

---

## 13. [controllers/mapController.js](backend/src/controllers/mapController.js)

### Database Operations
- SELECT

### Tables Referenced & Columns
**spaces**
- Columns: `id`, `name`, `type`, `location`, `latitude`, `longitude`, `thumbnail_url`

### Sample Queries
```sql
-- Get map markers
SELECT id, name, type, location, latitude, longitude, thumbnail_url
FROM spaces
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ORDER BY created_at DESC
```

---

## Summary Statistics

### Total Tables: 9
1. **users** - User accounts and profiles
2. **spaces** - Space listings
3. **services** - Add-on services
4. **bookings** - Booking records
5. **booking_slots** - Time slots for bookings
6. **booking_services** - Services linked to bookings
7. **chat_rooms** - Chat room containers
8. **chat_room_members** - Room membership
9. **chat_messages** - Individual messages
10. **notifications** - User notifications

### Common SQL Operations Found
- `SELECT` (most frequent) - used in all files except pricingService.js
- `INSERT INTO` - used in 7 files (bootstrap, notificationService, authController, adminController, bookingController, chatController)
- `UPDATE` - used in 6 files (bootstrap, reminderScheduler, userController, adminController, bookingController, notificationController)
- `DELETE` - used in 1 file (adminController)
- `JOIN` - used in 8 files for relational queries
- `WHERE` - used extensively for filtering
- `ORDER BY` - used in 10+ queries
- `LIMIT` - used for pagination and single-result constraints
- `GROUP_CONCAT`, `GROUP BY` - for chat room aggregation
- `CASE WHEN` - for conditional logic in SELECT
- `COALESCE` - for null handling in UPDATE
- `BEGIN TRANSACTION / COMMIT / ROLLBACK` - in bookingController for atomic operations

### Most Referenced Column Names
- `id` - primary key across all tables
- `user_id` - user associations (very frequent)
- `created_at` - timestamps (very frequent)
- `status` - state tracking (bookings mainly)
- `price_per_unit`, `pricing_unit` - pricing logic
- `room_id`, `booking_id` - entity associations
- `name`, `email` - user/space/service identification
- `latitude`, `longitude` - geolocation data
- `start_at`, `end_at` - time ranges for booking slots

### Special Database Features Used
- ENUM data types (role, room_type, status, pricing_unit, pricing_type)
- DECIMAL type for pricing
- JSON type for metadata storage (notifications)
- TIMESTAMP with DEFAULT CURRENT_TIMESTAMP
- FOREIGN KEY constraints for relational integrity
- UNIQUE constraints (email, direct_key)
- DEFAULT values (DEFAULT 0, DEFAULT 1, DEFAULT 'value')
- AUTO_INCREMENT for primary keys
- ON DELETE CASCADE for referential actions
