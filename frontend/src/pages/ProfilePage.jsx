import { useEffect, useState } from "react";
import api from "../api/client";
import SpaceCard from "../components/SpaceCard";
import { useAuth } from "../contexts/AuthContext";
import { getBookingStatusLabel } from "../utils/labels";

function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [profileResponse, transactionResponse, favoritesResponse] = await Promise.all([
      api.get("/users/profile"),
      api.get("/users/transactions"),
      api.get("/users/favorites")
    ]);
    setProfile(profileResponse.data);
    setTransactions(transactionResponse.data);
    setFavorites(favoritesResponse.data);
  }

  useEffect(() => {
    loadData();
    const refreshHandler = () => loadData();
    window.addEventListener("favorites:refresh", refreshHandler);

    return () => window.removeEventListener("favorites:refresh", refreshHandler);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const response = await api.patch("/users/profile", {
      fullName: profile.full_name,
      phone: profile.phone,
      avatarUrl: profile.avatar_url
    });
    setProfile(response.data);
    refreshUser(response.data);
    setMessage("Cập nhật hồ sơ thành công");
  }

  if (!profile) {
    return <p className="text-sm text-slate-500">Đang tải hồ sơ...</p>;
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr,1.15fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Hồ sơ</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Tài khoản của bạn</h1>
        </div>

        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={profile.full_name || ""}
          onChange={(event) => setProfile((prev) => ({ ...prev, full_name: event.target.value }))}
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={profile.email || ""}
          disabled
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={profile.phone || ""}
          onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="Số điện thoại"
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={profile.avatar_url || ""}
          onChange={(event) => setProfile((prev) => ({ ...prev, avatar_url: event.target.value }))}
          placeholder="Đường dẫn ảnh đại diện"
        />
        <button type="submit" className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
          Lưu thay đổi
        </button>
        {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
        </form>

        <section className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Giao dịch</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-900">Lịch sử giao dịch</h2>
          </div>
          <div className="rounded-[24px] bg-orange-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-600">Tổng giá trị</p>
            <p className="font-display text-2xl font-semibold text-slate-900">
              {transactions.reduce((sum, item) => sum + Number(item.total_amount), 0).toLocaleString()} VND
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {transactions.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">Đặt lịch #{item.id}</p>
                  <p className="text-sm text-slate-500">{item.space_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-700">{Number(item.total_amount).toLocaleString()} VND</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-600">{getBookingStatusLabel(item.status)}</p>
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>}
        </div>
        </section>
      </div>

      <section className="space-y-5 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Yêu thích</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-900">Danh sách yêu thích</h2>
          </div>
          <div className="rounded-[24px] bg-rose-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Tổng số</p>
            <p className="font-display text-2xl font-semibold text-slate-900">{favorites.length}</p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <p className="text-sm text-slate-500">Bạn chưa có không gian nào trong danh sách yêu thích.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {favorites.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default ProfilePage;
