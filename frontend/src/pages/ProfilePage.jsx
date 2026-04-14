import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace("/api", "");

function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [profileResponse, transactionResponse] = await Promise.all([
      api.get("/users/profile"),
      api.get("/users/transactions")
    ]);
    setProfile(profileResponse.data);
    setTransactions(transactionResponse.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await api.post("/users/avatar", formData);
      setProfile(response.data);
      refreshUser(response.data);
      setMessage("Cập nhật ảnh đại diện thành công");
      event.target.value = "";
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Lỗi tải ảnh");
      setTimeout(() => setMessage(""), 3000);
    }
  }

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
    <section className="grid gap-8 lg:grid-cols-[0.85fr,1.15fr]">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Profile</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Tài khoản của bạn</h1>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatar_url ? `${BACKEND_URL}${profile.avatar_url}` : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <label className="block cursor-pointer rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Chọn ảnh từ máy tính
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Tối đa 5MB, định dạng JPG, PNG</p>
            </div>
          </div>
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
        <button type="submit" className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
          Lưu thay đổi
        </button>
        {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
      </form>

      <section className="rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Transactions</p>
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
                  <p className="font-semibold text-slate-900">Booking #{item.id}</p>
                  <p className="text-sm text-slate-500">{item.space_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-700">{Number(item.total_amount).toLocaleString()} VND</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-600">{item.status}</p>
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>}
        </div>
      </section>
    </section>
  );
}

export default ProfilePage;
