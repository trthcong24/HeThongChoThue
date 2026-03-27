import { useEffect, useState } from "react";
import api from "../api/client";
import FilterPanel from "../components/FilterPanel";
import SpaceCard from "../components/SpaceCard";

const initialFilters = {
  keyword: "",
  type: "",
  location: "",
  minPrice: "",
  maxPrice: ""
};

function SpacesPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData(nextFilters = filters) {
    setLoading(true);
    const response = await api.get("/workspaces", { params: nextFilters });
    setSpaces(response.data.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const handler = () => loadData(filters);
    window.addEventListener("space:refresh", handler);
    return () => window.removeEventListener("space:refresh", handler);
  }, [filters]);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Workspace catalogue</p>
        <h1 className="font-display text-4xl font-bold text-slate-900">Danh sach khong gian</h1>
        <p className="max-w-2xl text-slate-600">
          Tim theo gia, loai phong va vi tri. Ket qua duoc lam moi realtime khi admin cap nhat kho
          du lieu.
        </p>
      </div>

      <FilterPanel
        filters={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onSubmit={(event) => {
          event.preventDefault();
          loadData(filters);
        }}
        onReset={() => {
          setFilters(initialFilters);
          loadData(initialFilters);
        }}
      />

      {loading && <p className="text-sm text-slate-500">Dang tai danh sach khong gian...</p>}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>

      {!loading && spaces.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
          Khong co ket qua phu hop voi bo loc hien tai.
        </div>
      )}
    </section>
  );
}

export default SpacesPage;
