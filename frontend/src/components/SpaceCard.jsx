import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";

const SpaceCard = ({ space, onFavoriteChanged }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const [isFavorite, setIsFavorite] = useState(Boolean(space.isFavorite));
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    setIsFavorite(Boolean(space.isFavorite));
  }, [space.isFavorite]);

  const imageSrc = space.thumbnail_url || (Array.isArray(space.images) ? space.images[0] : "") || "https://via.placeholder.com/1200x700?text=Vehicle";

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (isAdmin) {
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await api.delete(`/users/favorites/${space.id}`);
        setIsFavorite(false);
        onFavoriteChanged?.(false);
      } else {
        await api.post("/users/favorites", { spaceId: space.id });
        setIsFavorite(true);
        onFavoriteChanged?.(true);
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-panel transition hover:-translate-y-1">
      <img
        className="h-52 w-full object-cover"
        src={imageSrc}
        alt={space.name}
        onError={(event) => {
          event.currentTarget.src = "https://via.placeholder.com/1200x700?text=Vehicle";
        }}
      />
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-orange-600">{space.type}</p>
            <h3 className="font-display text-xl font-semibold text-slate-900">{space.name}</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {Number(space.price_per_unit).toLocaleString()} VND/{space.pricing_unit}
          </span>
        </div>
        <p className="text-sm text-slate-500">{space.location}</p>
        <p className="text-sm text-slate-600">Số chỗ: {space.capacity} người</p>
        <p className="line-clamp-3 text-sm text-slate-600">{space.description}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/vehicles/${space.id}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Xem chi tiết
          </Link>
          <Link
            to={`/booking/vehicle/${space.id}`}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Đặt ngay
          </Link>
          {isAuthenticated && !isAdmin && (
            <button
              type="button"
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
              className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 disabled:opacity-50"
            >
              {favoriteLoading ? "Đang xử lý..." : isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default SpaceCard;
