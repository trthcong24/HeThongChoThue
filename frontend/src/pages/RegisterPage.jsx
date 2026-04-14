import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await register(form.fullName, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
      <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Xác thực</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Tạo tài khoản</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Họ và tên"
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          type="password"
          placeholder="Mật khẩu"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <button type="submit" className="rounded-full bg-teal-700 px-6 py-3 font-semibold text-white">
          Đăng ký
        </button>
      </form>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}

export default RegisterPage;
