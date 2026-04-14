import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import SpaceCard from "../components/SpaceCard";

const HomePage = () => {
  const [spaces, setSpaces] = useState([]);

  useEffect(() => {
    const loadFeatured = () => {
      api.get("/vehicles", { params: { maxPrice: 600000 } }).then((response) => {
        setSpaces((response.data.data || []).slice(0, 3));
      });
    };

    loadFeatured();
    window.addEventListener("space:refresh", loadFeatured);

    return () => window.removeEventListener("space:refresh", loadFeatured);
  }, []);

  return (
    <section className="space-y-10">
      <div className="grid gap-6 rounded-[40px] border border-orange-100 bg-white/80 p-8 shadow-panel lg:grid-cols-[1.1fr,0.9fr] lg:p-12">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-orange-600">Car rental platform</p>
          <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-slate-900 lg:text-6xl">
            Thuê xe linh hoạt theo giờ hoặc theo ngày, đặt nhanh chỉ trong vài bước.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Nền tảng thuê xe có bản đồ vị trí theo mã thuê, chat trực tiếp với quản trị và thông báo realtime cho toàn bộ hành trình đặt xe.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/vehicles" className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
              Khám phá xe
            </Link>
            <Link to="/map" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">
              Xem bản đồ
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-[32px] bg-gradient-to-br from-orange-100 via-white to-teal-100 p-6">
          <div className="rounded-[28px] bg-slate-900 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300">Realtime</p>
            <p className="mt-3 font-display text-3xl font-semibold">Chat, đơn thuê, thông báo</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] bg-white p-5 shadow-panel">
              <p className="text-sm text-slate-500">Dòng xe</p>
              <p className="mt-2 font-display text-3xl font-semibold text-slate-900">4+</p>
            </div>
            <div className="rounded-[28px] bg-white p-5 shadow-panel">
              <p className="text-sm text-slate-500">Tiện ích đi kèm</p>
              <p className="mt-2 font-display text-3xl font-semibold text-slate-900">Tự thêm</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Featured vehicles</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-900">Xe nổi bật</h2>
          </div>
          <Link to="/vehicles" className="text-sm font-semibold text-slate-700">
            Xem tất cả
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      </section>
    </section>
  );
};

export default HomePage;
