import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";

const initialForm = {
  name: "",
  price: "",
  pricingType: "per_booking",
  description: "",
  isActive: true
};

function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  async function loadData() {
    const response = await api.get("/admin/services");
    setServices(response.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (editingId) {
      await api.put(`/admin/services/${editingId}`, { ...form, price: Number(form.price) });
    } else {
      await api.post("/admin/services", { ...form, price: Number(form.price) });
    }
    setForm(initialForm);
    setEditingId(null);
    await loadData();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Quản trị</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quản lý dịch vụ</h1>
      </div>
      <AdminTabs />

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-[28px] border border-orange-100 bg-white p-6 shadow-panel md:grid-cols-2">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Tên dịch vụ"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          type="number"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Giá"
          value={form.price}
          onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
        />
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={form.pricingType}
          onChange={(event) => setForm((prev) => ({ ...prev, pricingType: event.target.value }))}
        >
          <option value="per_booking">Theo đặt lịch</option>
          <option value="per_slot">Theo khung giờ</option>
        </select>
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          value={form.isActive ? "1" : "0"}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === "1" }))}
        >
          <option value="1">Đang hoạt động</option>
          <option value="0">Tạm dừng</option>
        </select>
        <textarea
          className="md:col-span-2 min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Mô tả"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <button type="submit" className="w-fit rounded-full bg-teal-700 px-5 py-3 font-semibold text-white">
          {editingId ? "Cập nhật dịch vụ" : "Thêm dịch vụ"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-[28px] border border-orange-100 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-orange-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Loại giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{service.name}</td>
                <td className="px-4 py-3">{Number(service.price).toLocaleString()} VND</td>
                <td className="px-4 py-3">{service.pricing_type}</td>
                <td className="px-4 py-3">{service.is_active ? "Đang hoạt động" : "Tạm dừng"}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                    onClick={() => {
                      setEditingId(service.id);
                      setForm({
                        name: service.name,
                        price: String(service.price),
                        pricingType: service.pricing_type,
                        description: service.description || "",
                        isActive: Boolean(service.is_active)
                      });
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-3 py-2 font-semibold text-red-600"
                    onClick={async () => {
                      await api.delete(`/admin/services/${service.id}`);
                      await loadData();
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminServicesPage;
