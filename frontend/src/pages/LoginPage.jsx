import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const currentUser = await login(form.email, form.password);
      navigate(currentUser?.role === "admin" ? "/admin/dashboard" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-[32px] border border-orange-100 bg-white p-8 shadow-panel">
      <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Xác thực</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Đăng nhập</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
        <button type="submit" className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white">
          Đăng nhập
        </button>
      </form>

      {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}

export default LoginPage;
