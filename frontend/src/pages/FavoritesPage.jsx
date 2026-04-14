import { useEffect, useState } from "react";
import api from "../api/client";
import SpaceCard from "../components/SpaceCard";

function FavoritesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFavorites() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/users/favorites");
      setSpaces(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Favorites</p>
        <h1 className="font-display text-4xl font-bold text-slate-900">Xe yêu thích</h1>
        <p className="max-w-2xl text-slate-600">Lưu danh sách xe bạn quan tâm để đặt thuê nhanh hơn.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải danh sách yêu thích...</p>}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {!loading && !error && spaces.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
          Bạn chưa có xe yêu thích nào.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => (
          <SpaceCard
            key={space.id}
            space={{ ...space, isFavorite: true }}
            onFavoriteChanged={(nextFavoriteState) => {
              if (!nextFavoriteState) {
                setSpaces((prev) => prev.filter((item) => item.id !== space.id));
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default FavoritesPage;
