import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";
import { getBookingStatusLabel } from "../../utils/labels";

function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);

  async function loadData() {
    const response = await api.get("/admin/bookings");
    setBookings(response.data);
  }

  useEffect(() => {
    loadData();
    const refreshHandler = () => loadData();
    window.addEventListener("booking:refresh", refreshHandler);

    return () => window.removeEventListener("booking:refresh", refreshHandler);
  }, []);

  async function changeStatus(id, status) {
    await api.patch(`/admin/bookings/${id}/status`, { status });
    await loadData();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Bảng quản trị</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quản lý đặt lịch</h1>
      </div>
      <AdminTabs />

      <div className="grid gap-5">
        {bookings.map((item) => (
          <article key={item.id} className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-orange-600">Đặt lịch #{item.id}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{item.space_name}</h2>
                <p className="text-sm text-slate-500">
                  {item.user_name} ({item.user_email})
                </p>
              </div>
              <div className="rounded-[24px] bg-orange-50 px-4 py-3 text-right">
                <p className="font-semibold text-emerald-700">{Number(item.total_amount).toLocaleString()} VND</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{getBookingStatusLabel(item.status)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Khung giờ</p>
                <div className="mt-3 space-y-2">
                  {item.slots.map((slot) => (
                    <div key={slot.id}>
                      {new Date(slot.start_at).toLocaleString()} - {new Date(slot.end_at).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Dịch vụ</p>
                <div className="mt-3 space-y-2">
                  {item.services.length === 0 && <p>Không có dịch vụ thêm.</p>}
                  {item.services.map((service) => (
                    <div key={service.service_id}>
                      {service.name} x{service.quantity} - {Number(service.total_price).toLocaleString()} VND
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => changeStatus(item.id, "confirmed")}
                className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => changeStatus(item.id, "cancelled")}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => changeStatus(item.id, "pending")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Chờ duyệt
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdminBookingsPage;
