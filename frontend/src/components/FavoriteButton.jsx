import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";

function FavoriteButton({ spaceId, initialIsFavorite = false, onChange, className = "" }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(Boolean(initialIsFavorite));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFavorite(Boolean(initialIsFavorite));
  }, [initialIsFavorite]);

  async function handleToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const nextValue = !isFavorite;

      if (isFavorite) {
        await api.delete(`/users/favorites/${spaceId}`);
      } else {
        await api.post(`/users/favorites/${spaceId}`);
      }

      setIsFavorite(nextValue);
      onChange?.(nextValue);
      window.dispatchEvent(new CustomEvent("favorites:refresh", { detail: { spaceId, isFavorite: nextValue } }));
    } catch (error) {
      window.alert(error.response?.data?.message || "Không thể cập nhật mục yêu thích");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        isFavorite
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-slate-200 bg-white text-slate-700"
      } ${className}`}
    >
      {isFavorite ? "♥ Bỏ yêu thích" : "♡ Thêm vào yêu thích"}
    </button>
  );
}

export default FavoriteButton;
