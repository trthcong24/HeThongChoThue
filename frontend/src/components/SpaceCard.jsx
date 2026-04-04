import { Link } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import { getPricingUnitLabel, getSpaceTypeLabel } from "../utils/labels";

function SpaceCard({ space }) {
  const imageSrc =
    space.thumbnail_url ||
    (Array.isArray(space.images) ? space.images[0] : "") ||
    "https://via.placeholder.com/1200x700?text=Kh%C3%B4ng+gian";

  return (
    <article className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-panel transition hover:-translate-y-1">
      <img
        className="h-52 w-full object-cover"
        src={imageSrc}
        alt={space.name}
        onError={(event) => {
          event.currentTarget.src = "https://via.placeholder.com/1200x700?text=Kh%C3%B4ng+gian";
        }}
      />
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-600">{getSpaceTypeLabel(space.type)}</p>
            <h3 className="font-display text-xl font-semibold text-slate-900">{space.name}</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {Number(space.price_per_unit).toLocaleString()} VND/{getPricingUnitLabel(space.pricing_unit)}
          </span>
        </div>
        <p className="text-sm text-slate-500">{space.location}</p>
        <p className="text-sm text-slate-600">Sức chứa: {space.capacity} người</p>
        <p className="line-clamp-3 text-sm text-slate-600">{space.description}</p>
        <div className="flex flex-wrap gap-3">
          <FavoriteButton spaceId={space.id} initialIsFavorite={space.is_favorite} />
          <Link
            to={`/spaces/${space.id}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Xem chi tiết
          </Link>
          <Link
            to={`/booking/${space.id}`}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Đặt ngay
          </Link>
        </div>
      </div>
    </article>
  );
}

export default SpaceCard;
