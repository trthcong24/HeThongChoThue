import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { getPricingUnitLabel, getSpaceTypeLabel } from "../utils/labels";

function BookingPage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [slots, setSlots] = useState([{ startAt: "", endAt: "" }]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get(`/workspaces/${spaceId}`).then((response) => setSpace(response.data));
  }, [spaceId]);

  function updateSlot(index, key, value) {
    setSlots((prev) => prev.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [key]: value } : slot)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await api.post("/bookings", {
        spaceId: Number(spaceId),
        slots,
        serviceIds: selectedServices,
        note
      });
      setMessage(`Đã tạo đặt lịch #${response.data.id} thành công.`);
      navigate("/my-bookings");
    } catch (error) {
      setMessage(error.response?.data?.message || "Không thể tạo đặt lịch");
    }
  }

  if (!space) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu đặt lịch...</p>;
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr,0.8fr]">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Tạo đặt lịch</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Đặt lịch cho {space.name}</h1>
          <p className="mt-2 text-slate-600">Bạn có thể đặt nhiều khung giờ trong một lần gửi.</p>
        </div>

        <div className="space-y-4">
          {slots.map((slot, index) => (
            <div key={index} className="grid gap-4 rounded-[24px] border border-slate-200 p-4 md:grid-cols-[1fr,1fr,auto]">
              <input
                type="datetime-local"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={slot.startAt}
                onChange={(event) => updateSlot(index, "startAt", event.target.value)}
                required
              />
              <input
                type="datetime-local"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                value={slot.endAt}
                onChange={(event) => updateSlot(index, "endAt", event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index))}
                disabled={slots.length === 1}
                className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, { startAt: "", endAt: "" }])}
          className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
        >
          Thêm khung giờ
        </button>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Dịch vụ đi kèm</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {space.services.map((service) => (
              <label key={service.id} className="flex items-start gap-3 rounded-[24px] border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={(event) => {
                    setSelectedServices((prev) =>
                      event.target.checked ? [...prev, service.id] : prev.filter((item) => item !== service.id)
                    );
                  }}
                />
                <span>
                  <span className="block font-semibold text-slate-900">{service.name}</span>
                  <span className="block text-sm text-slate-500">{service.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <textarea
          className="min-h-28 w-full rounded-[24px] border border-slate-200 px-4 py-3 text-sm"
          placeholder="Ghi chú thêm cho quản trị viên"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <button type="submit" className="rounded-full bg-teal-700 px-6 py-3 font-semibold text-white">
          Gửi đặt lịch
        </button>

        {message && <p className="text-sm font-medium text-orange-600">{message}</p>}
      </form>

      <aside className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <h2 className="font-display text-2xl font-semibold text-slate-900">Tóm tắt không gian</h2>
        <img className="h-56 w-full rounded-[24px] object-cover" src={space.thumbnail_url} alt={space.name} />
        <div className="space-y-2 text-sm text-slate-600">
          <p>Loại: {getSpaceTypeLabel(space.type)}</p>
          <p>Địa điểm: {space.location}</p>
          <p>Sức chứa: {space.capacity} người</p>
          <p>
            Đơn giá cơ bản: {Number(space.price_per_unit).toLocaleString()} VND/{getPricingUnitLabel(space.pricing_unit)}
          </p>
        </div>
      </aside>
    </section>
  );
}

export default BookingPage;
