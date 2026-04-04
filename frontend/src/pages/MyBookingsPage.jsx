import { useEffect, useState } from "react";
import api from "../api/client";
import { getBookingStatusLabel } from "../utils/labels";

function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const response = await api.get("/bookings/user");
      setBookings(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const refreshHandler = () => loadData();
    window.addEventListener("booking:refresh", refreshHandler);

    return () => window.removeEventListener("booking:refresh", refreshHandler);
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Lịch sử đặt lịch</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Đặt lịch của tôi</h1>
      </div>
      {loading && <p>Đang tải dữ liệu...</p>}

      {!loading && bookings.length === 0 && <p>Bạn chưa có đặt lịch nào.</p>}

      <div className="grid gap-5">
        {bookings.map((item) => (
          <article key={item.id} className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-orange-600">Đặt lịch #{item.id}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{item.space_name}</h2>
                <p className="text-sm text-slate-500">{item.space_location}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-700">{Number(item.total_amount).toLocaleString()} VND</p>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{getBookingStatusLabel(item.status)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Khung giờ</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {item.slots.map((slot) => (
                    <div key={slot.id}>
                      {new Date(slot.start_at).toLocaleString()} - {new Date(slot.end_at).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Dịch vụ</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {item.services.length === 0 && <p>Không có dịch vụ thêm.</p>}
                  {item.services.map((service) => (
                    <div key={service.service_id}>
                      {service.name} x{service.quantity} - {Number(service.total_price).toLocaleString()} VND
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {item.status !== "cancelled" && (
              <button
                type="button"
                onClick={async () => {
                  await api.patch(`/bookings/${item.id}/cancel`);
                  await loadData();
                }}
                className="mt-5 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600"
              >
                Hủy lịch
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default MyBookingsPage;
