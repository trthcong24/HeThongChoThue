import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";

const initialForm = {
  code: "",
  label: "",
  description: "",
  isActive: true
};

function AdminSpaceTypesPage() {
  const [spaceTypes, setSpaceTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  async function loadData() {
    const response = await api.get("/admin/space-types?includeInactive=1");
    setSpaceTypes(response.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await api.put(`/admin/space-types/${editingId}`, {
          code: form.code,
          label: form.label,
          description: form.description,
          isActive: form.isActive
        });
        setMessage("Cập nhật dòng xe thành công");
      } else {
        await api.post("/admin/space-types", {
          code: form.code,
          label: form.label,
          description: form.description,
          isActive: form.isActive
        });
        setMessage("Thêm dòng xe thành công");
      }

      setForm(initialForm);
      setEditingId(null);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Xử lý thất bại");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Bạn chắc chắn muốn xóa loại ${item.label}?`)) {
      return;
    }

    try {
      await api.delete(`/admin/space-types/${item.id}`);
      setMessage("Đã xóa dòng xe");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Xóa thất bại");
    }
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      label: item.label,
      description: item.description || "",
      isActive: Boolean(item.is_active)
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trung tâm quản trị</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quản lý dòng xe</h1>
      </div>
      <AdminTabs />

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Mã loại</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="vi_du: podcast_room"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Tên hiển thị</span>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Ví dụ: Phòng podcast"
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Mô tả</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <label className="inline-flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Kích hoạt loại này
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            {editingId ? "Cập nhật" : "Thêm loại"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
              }}
            >
              Hủy sửa
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3">Số xe</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {spaceTypes.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{item.label}</td>
                <td className="px-4 py-3 text-slate-600">{item.description || "-"}</td>
                <td className="px-4 py-3">{item.spaces_count}</td>
                <td className="px-4 py-3">{item.is_active ? "Hoạt động" : "Đang ẩn"}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"
                    onClick={() => handleEdit(item)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-3 py-1.5 font-semibold text-red-600"
                    onClick={() => handleDelete(item)}
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

export default AdminSpaceTypesPage;
