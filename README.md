# He thong cho thue khong gian (SpaceFlow)

Du an web cho thue khong gian theo yeu cau:
- Backend Node.js (Express Web API)
- Frontend React + Vite + TailwindCSS
- Database MySQL
- JWT authentication
- Socket.IO realtime updates
- Cache cho danh sach khong gian (NodeCache)
- Booking nhieu khung gio trong 1 lan dat
- Dịch vụ đi kèm tinh phi theo booking/slot
- Chat realtime luu lich su trong database
- Notification realtime khi tao booking, cap nhat booking, sap den gio su dung
- Trang user: Home, danh sach khong gian, chi tiet khong gian, dat lich, ban do, chat, profile, lich su booking
- Trang admin: Spaces, Bookings, Services, Users

## 1) Cau truc thu muc

```
HeThongChoThue/
  backend/
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      utils/
      app.js
      server.js
    sql/
      schema.sql
      seed.sql
    .env.example
    package.json
  frontend/
    src/
      api/
      components/
      contexts/
      pages/
      styles/
      App.jsx
      main.jsx
    .env.example
    package.json
  README.md
```

## 2) Quy trinh xu ly chinh

### Luong nguoi dung
1. Dang ky/Dang nhap qua `/api/auth/*`.
2. JWT duoc luu localStorage va gui Bearer token cho moi request.
3. Tim kiem khong gian qua `/api/workspaces` theo tu khoa, gia, loai phong, vi tri.
4. Xem chi tiet khong gian va cac dich vu di kem qua `/api/workspaces/:id`.
5. Dat lich qua `/api/bookings` voi:
  - mot hoac nhieu slot trong mot request
  - chon them serviceIds
  - tinh gia theo `pricing_unit`
  - kiem tra trung lich tren bang `booking_slots`
6. Xem va huy booking cua minh qua `/api/bookings/user`, `/api/bookings/:id/cancel`.
7. Xem profile va lich su giao dich qua `/api/users/profile`, `/api/users/transactions`.
8. Chat qua `/api/chat/*`, nhan thong bao qua `/api/notifications`.

### Luong admin
1. Admin dang nhap voi role `admin`.
2. Quan ly Spaces:
  - GET `/api/admin/spaces`
  - POST `/api/admin/spaces`
  - PUT `/api/admin/spaces/:id`
  - DELETE `/api/admin/spaces/:id`
3. Quan ly Bookings:
  - GET `/api/admin/bookings`
  - PATCH `/api/admin/bookings/:id/status`
4. Quan ly Services:
  - GET `/api/admin/services`
  - POST `/api/admin/services`
  - PUT `/api/admin/services/:id`
  - DELETE `/api/admin/services/:id`
5. Quan ly Users:
  - GET `/api/admin/users`
  - PATCH `/api/admin/users/:id/role`

### Socket realtime
- `booking:created`: co booking moi.
- `booking:statusChanged`: booking duoc cap nhat trang thai.
- `space:changed`: co thay doi ve khong gian.
- `notification:new`: thong bao moi cho tung user.
- `chat:message`: tin nhan moi.

Frontend lang nghe cac event nay de tu dong reload du lieu.

### Reminder scheduler
- Backend co bo nho scheduler chay moi 60 giay.
- Tu dong tao notification khi slot sap bat dau trong `REMINDER_LEAD_MINUTES`.

## 3) Cai dat va chay

### Yeu cau
- Node.js 18+
- MySQL 8+

### Buoc 1: Tao database
Chay script SQL:

```sql
SOURCE backend/sql/schema.sql;
SOURCE backend/sql/seed.sql;
```

Luu y:
- Backend co co che bootstrap du lieu mau lan dau.
- Neu database ban gui sau nay co schema rieng, ban co the thay the file SQL va mapping query trong `backend/src/controllers`.

### Buoc 2: Cau hinh moi truong

Backend: tao file `backend/.env` tu `backend/.env.example`.

Frontend: tao file `frontend/.env` tu `frontend/.env.example`.

### Buoc 3: Cai dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Buoc 4: Chay he thong

Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Truy cap: `http://localhost:5173`

## 4) Tai khoan demo

- Admin: `admin@space.com` / `123456`
- User: `user@space.com` / `123456`

(duoc tao tu dong khi backend khoi dong lan dau va bang users dang trong)

## 5) Kien truc backend

- `controllers/`: xu ly HTTP request/response.
- `routes/`: dinh tuyen endpoint.
- `middlewares/auth.js`: xac thuc JWT va phan quyen role.
- `services/bootstrap.js`: tao bang + seed data mau khi khoi dong.
- `services/socket.js`: luu `io` instance de phat su kien tu controller.
- `services/pricingService.js`: validate slot va tinh gia theo gio/ngay.
- `services/bookingQueryService.js`: hydrate bookings + slots + services.
- `services/notificationService.js`: luu notification DB va phat realtime.
- `services/reminderScheduler.js`: quet slot sap toi va gui nhac lich.
- `config/cache.js`: cache danh sach workspace de giam query lap.

## 6) API chinh

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/workspaces`
- `GET /api/workspaces/:id`
- `GET /api/map`
- `POST /api/bookings`
- `GET /api/bookings/user`
- `PATCH /api/bookings/:id/cancel`
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `GET /api/users/transactions`
- `GET /api/chat/contacts`
- `GET /api/chat/rooms`
- `GET /api/chat/rooms/:roomId/messages`
- `POST /api/chat`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## 7) Huong mo rong tiep theo

- Thay bo nho reminder bang Redis Pub/Sub khi scale nhieu instance.
- Them bo loc tim kiem theo ngay trong khoang trong.
- Tich hop thanh toan online.
- Them dashboard thong ke doanh thu/thoi gian su dung.
- Luu refresh token va co che logout all devices.
