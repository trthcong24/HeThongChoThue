import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

const BookingPage = () => {
  const { spaceId, vehicleId } = useParams();
  const selectedRouteVehicleId = Number(vehicleId || spaceId);
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [slots, setSlots] = useState([{ startAt: "", endAt: "" }]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.get(`/vehicles/${selectedRouteVehicleId}`), api.get("/vehicles")])
      .then(([detailResponse, listResponse]) => {
        setSpace(detailResponse.data);
        setVehicles(listResponse.data?.data || []);
        setSelectedVehicleIds([selectedRouteVehicleId]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedRouteVehicleId]);

  const updateSlot = (index, key, value) => {
    setSlots((prev) => prev.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [key]: value } : slot)));
  };

  const validateBeforeSubmit = () => {
    if (selectedVehicleIds.length === 0) {
      return "Bạn cần chọn ít nhất 1 xe.";
    }
    if (selectedVehicleIds.length > 5) {
      return "Tối đa 5 xe cho mỗi lần thuê.";
    }

    const hasInvalidSlot = slots.some((slot) => !slot.startAt || !slot.endAt || new Date(slot.endAt) <= new Date(slot.startAt));
    if (hasInvalidSlot) {
      return "Khung giờ không hợp lệ. Vui lòng kiểm tra lại thời gian bắt đầu/kết thúc.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/bookings", {
        spaceIds: selectedVehicleIds,
        slots,
        serviceIds: selectedServices,
        note
      });

      if (Array.isArray(response.data.rentalCodes)) {
        setMessage(`Đã tạo ${response.data.totalVehicles} đơn thuê xe. Mã thuê: ${response.data.rentalCodes.join(", ")}`);
      } else {
        setMessage(`Đã tạo đơn thuê xe ${response.data.rental_code || `RENT-${response.data.id}`} thành công.`);
      }

      navigate("/my-bookings");
    } catch (error) {
      setMessage(error.response?.data?.message || "Không thể tạo đơn thuê xe");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !space) {
    return <p className="text-sm text-slate-500">Đang tải dữ liệu đặt lịch...</p>;
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr,0.8fr]">
      <form onSubmit={handleSubmit} className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Car rental builder</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Đặt thuê xe cho {space.name}</h1>
          <p className="mt-2 text-slate-600">Mỗi lần thuê có thể chọn từ 1 đến 5 xe và nhiều khung giờ.</p>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Chọn xe</h2>
          <p className="text-sm text-slate-500">Đã chọn {selectedVehicleIds.length}/5 xe.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <label key={vehicle.id} className="flex items-center gap-3 rounded-[20px] border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={selectedVehicleIds.includes(vehicle.id)}
                  onChange={(event) => {
                    setSelectedVehicleIds((prev) => {
                      if (event.target.checked) {
                        if (prev.length >= 5) {
                          return prev;
                        }
                        return [...prev, vehicle.id];
                      }
                      if (prev.length === 1) {
                        return prev;
                      }
                      return prev.filter((id) => id !== vehicle.id);
                    });
                  }}
                />
                <span>
                  <span className="block font-semibold text-slate-900">{vehicle.name}</span>
                  <span className="block text-xs text-slate-500">
                    {vehicle.location} · {Number(vehicle.price_per_unit).toLocaleString()} VND/{vehicle.pricing_unit}
                  </span>
                </span>
              </label>
            ))}
          </div>
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
          placeholder="Ghi chú thêm cho admin"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <button type="submit" className="rounded-full bg-teal-700 px-6 py-3 font-semibold text-white">
          {isSubmitting ? "Đang xử lý..." : "Gửi đặt lịch"}
        </button>

        {message && <p className="text-sm font-medium text-orange-600">{message}</p>}
      </form>

      <aside className="space-y-6 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <h2 className="font-display text-2xl font-semibold text-slate-900">Tóm tắt xe</h2>
        <img className="h-56 w-full rounded-[24px] object-cover" src={space.thumbnail_url} alt={space.name} />
        <div className="space-y-2 text-sm text-slate-600">
          <p>Mẫu xe: {space.type}</p>
          <p>Vị trí xe: {space.location}</p>
          <p>Số xe đã chọn: {selectedVehicleIds.length}</p>
          <p>
            Đơn giá cơ bản: {Number(space.price_per_unit).toLocaleString()} VND/{space.pricing_unit}
          </p>
        </div>
      </aside>
    </section>
  );
};

export default BookingPage;
