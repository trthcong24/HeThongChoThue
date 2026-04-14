import { useEffect, useState } from "react";
import api from "../api/client";
import EmptyState from "../components/EmptyState";
import FilterPanel from "../components/FilterPanel";
import PageHeader from "../components/PageHeader";
import SpaceCard from "../components/SpaceCard";

const initialFilters = {
  keyword: "",
  type: "",
  location: "",
  minPrice: "",
  maxPrice: ""
};

const SpacesPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (nextFilters = filters) => {
    setLoading(true);
    const response = await api.get("/vehicles", { params: nextFilters });
    setSpaces(response.data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData(filters);
    window.addEventListener("space:refresh", handler);
    return () => window.removeEventListener("space:refresh", handler);
  }, [filters]);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Vehicle catalogue"
        title="Danh sách xe cho thuê"
        description="Tìm theo giá, dòng xe và vị trí nhận xe. Kết quả được cập nhật realtime khi admin thay đổi."
      />

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

      {loading && <p className="text-sm text-slate-500">Đang tải danh sách xe...</p>}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>

      {!loading && spaces.length === 0 && <EmptyState message="Không có kết quả phù hợp với bộ lọc hiện tại." />}
    </section>
  );
};

export default SpacesPage;
