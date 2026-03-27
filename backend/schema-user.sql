-- Create database and tables based on user's schema for HeThongChoThue

USE hethongchothue;

-- Drop existing tables if they exist (optional, comment out if you want to keep existing data)
-- DROP TABLE IF EXISTS booking_services;
-- DROP TABLE IF EXISTS booking_time_slots;
-- DROP TABLE IF EXISTS bookings;
-- DROP TABLE IF EXISTS workspace_images;
-- DROP TABLE IF EXISTS services;
-- DROP TABLE IF EXISTS workspaces;
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    role ENUM('user', 'admin') DEFAULT 'user',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    address VARCHAR(255),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    price_per_hour DECIMAL(10,2),
    capacity INT,
    type ENUM('meeting_room', 'desk', 'private_office'),
    status ENUM('available', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create workspace_images table
CREATE TABLE IF NOT EXISTS workspace_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT,
    image_url VARCHAR(255),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Create services table (global services, not per-workspace)
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    workspace_id INT,
    booking_code VARCHAR(50) UNIQUE,
    total_price DECIMAL(10,2),
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Create booking_time_slots table
CREATE TABLE IF NOT EXISTS booking_time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    start_time DATETIME,
    end_time DATETIME,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Create booking_services table
CREATE TABLE IF NOT EXISTS booking_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    service_id INT,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Create messages table (Direct messages between users)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert demo data
INSERT INTO users (name, email, password, phone, role) VALUES 
('Admin User', 'admin@hethongchothue.com', '$2a$10$HBhdZBaRURSWggCY1LNjoOYYb7kMZkg5M5ma9ArUmsLUrLJz6lfsa', '0901000001', 'admin'),
('Demo User', 'user@hethongchothue.com', '$2a$10$HBhdZBaRURSWggCY1LNjoOYYb7kMZkg5M5ma9ArUmsLUrLJz6lfsa', '0901000002', 'user');

INSERT INTO workspaces (name, description, address, lat, lng, price_per_hour, capacity, type, status) VALUES 
('Meeting Room A', 'Professional meeting room for teams', '123 Main St, District 1', 10.7769, 106.6869, 50.00, 10, 'meeting_room', 'available'),
('Private Office', 'Dedicated private office space', '456 Business Ave, District 3', 10.8000, 106.7000, 100.00, 5, 'private_office', 'available'),
('Desk Space', 'Individual desk in shared workspace', '789 Tech Park, District 4', 10.8200, 106.7200, 20.00, 1, 'desk', 'available');

INSERT INTO services (name, description, price) VALUES 
('WiFi', 'High-speed internet connection', 5.00),
('Projector', 'HD projector for presentations', 15.00),
('Coffee Service', 'Complimentary coffee and tea', 10.00),
('Parking', 'Dedicated parking space', 25.00);
