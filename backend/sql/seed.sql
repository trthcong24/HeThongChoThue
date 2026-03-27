USE space_rental;

-- Demo users are auto-created by backend bootstrap on first run:
-- admin@space.com / 123456
-- user@space.com / 123456

INSERT INTO spaces (name, type, location, capacity, price_per_unit, pricing_unit, thumbnail_url, description, latitude, longitude)
VALUES
  (
    'Sky Hall Meeting Room',
    'meeting_room',
    'Quan 1, TP.HCM',
    40,
    450000,
    'hour',
    'https://images.unsplash.com/photo-1497366412874-3415097a27e7',
    'Phong hop hien dai, day du am thanh, man hinh LED.',
    10.776889,
    106.700806
  ),
  (
    'Creative Studio Loft',
    'creative_studio',
    'Quan 3, TP.HCM',
    20,
    350000,
    'hour',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2',
    'Khong gian chup anh, workshop nho, bo tri linh hoat.',
    10.784264,
    106.684510
  ),
  (
    'Coworking Riverside',
    'coworking',
    'Thu Duc, TP.HCM',
    60,
    250000,
    'day',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
    'Cho ngoi linh hoat, phu hop freelancer va team nho.',
    10.841111,
    106.809998
  )
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO services (name, price, pricing_type, description, is_active)
VALUES
  ('Wifi toc do cao', 50000, 'per_booking', 'Tang bang thong internet cao hon cho su kien quan trong.', 1),
  ('Nuoc uong', 15000, 'per_slot', 'Suat nuoc tinh theo moi khung gio dat.', 1),
  ('May chieu', 120000, 'per_booking', 'Phu hop cho workshop, presentation.', 1),
  ('Phong hop rieng', 300000, 'per_slot', 'Nang cap khong gian rieng cho team.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
