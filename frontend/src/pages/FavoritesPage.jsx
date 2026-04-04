import { useEffect, useState } from "react";
import api from "../api/client";
import SpaceCard from "../components/SpaceCard";

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const response = await api.get("/users/favorites");
      setFavorites(response.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const refreshHandler = () => loadData();
    window.addEventListener("favorites:refresh", refreshHandler);

    return () => window.removeEventListener("favorites:refresh", refreshHandler);
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Yêu thích</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Danh sách yêu thích</h1>
          <p className="mt-2 text-slate-600">Xem nhanh tất cả không gian bạn đã lưu để tiện so sánh và đặt lịch.</p>
        </div>
        <div className="rounded-[24px] bg-rose-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Đã lưu</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{favorites.length}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Đang tải danh sách yêu thích...</p>}

      {!loading && favorites.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
          Bạn chưa có không gian nào trong danh sách yêu thích.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {favorites.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
    </section>
  );
}

export default FavoritesPage;
