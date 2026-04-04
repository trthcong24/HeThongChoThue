import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import FavoriteButton from "../components/FavoriteButton";
import { getBookingStatusLabel, getPricingTypeLabel, getPricingUnitLabel, getSpaceTypeLabel } from "../utils/labels";

function SpaceDetailPage() {
  const { id } = useParams();
  const [space, setSpace] = useState(null);

  useEffect(() => {
    api.get(`/workspaces/${id}`).then((response) => setSpace(response.data));
  }, [id]);

  if (!space) {
    return <p className="text-sm text-slate-500">Đang tải chi tiết không gian...</p>;
  }

  const imageSrc =
    space.thumbnail_url ||
    (Array.isArray(space.images) ? space.images[0] : "") ||
    "https://via.placeholder.com/1200x700?text=Kh%C3%B4ng+gian";

  return (
    <section className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-panel">
          <img
            className="h-[420px] w-full object-cover"
            src={imageSrc}
            alt={space.name}
            onError={(event) => {
              event.currentTarget.src = "https://via.placeholder.com/1200x700?text=Kh%C3%B4ng+gian";
            }}
          />
        </div>

        <div className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">{getSpaceTypeLabel(space.type)}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">{space.name}</h1>
          <p className="mt-4 text-slate-600">{space.description}</p>

          <div className="mt-6 grid gap-4 rounded-[28px] bg-orange-50 p-5 text-sm text-slate-700">
            <p>Địa điểm: {space.location}</p>
            <p>Sức chứa: {space.capacity} người</p>
            <p>
              Đơn giá: {Number(space.price_per_unit).toLocaleString()} VND/{getPricingUnitLabel(space.pricing_unit)}
            </p>
            <p>
              Tọa độ: {space.latitude || "-"}, {space.longitude || "-"}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <FavoriteButton
              spaceId={space.id}
              initialIsFavorite={space.is_favorite}
              onChange={(nextValue) => setSpace((prev) => (prev ? { ...prev, is_favorite: nextValue } : prev))}
            />
            <Link to={`/booking/${space.id}`} className="rounded-full bg-teal-700 px-5 py-3 font-semibold text-white">
              Đặt lịch
            </Link>
            <Link to="/map" className="rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700">
              Xem trên bản đồ
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-panel">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Dịch vụ đi kèm</h2>
          <div className="mt-4 space-y-3">
            {space.services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{service.name}</p>
                    <p className="text-sm text-slate-500">{service.description}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {Number(service.price).toLocaleString()} VND/{getPricingTypeLabel(service.pricing_type)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-panel">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Khung giờ sắp tới</h2>
          <div className="mt-4 space-y-3">
            {space.upcomingSlots.length === 0 && <p className="text-sm text-slate-500">Chưa có lịch sắp tới.</p>}
            {space.upcomingSlots.map((slot, index) => (
              <div key={`${slot.start_at}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{new Date(slot.start_at).toLocaleString()}</p>
                <p className="text-sm text-slate-500">Đến {new Date(slot.end_at).toLocaleString()}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-orange-600">{getBookingStatusLabel(slot.status)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export default SpaceDetailPage;
