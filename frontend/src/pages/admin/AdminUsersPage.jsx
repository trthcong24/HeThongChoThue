import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";

function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  async function loadData() {
    const response = await api.get("/admin/users");
    setUsers(response.data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function changeRole(id, role) {
    await api.patch(`/admin/users/${id}/role`, { role });
    await loadData();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Admin panel</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quan ly Users</h1>
      </div>
      <AdminTabs />

      <div className="overflow-x-auto rounded-[28px] border border-orange-100 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-orange-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Ten</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Cap nhat Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.full_name}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.phone || "-"}</td>
                <td className="px-4 py-3">{item.role}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                    onClick={() => changeRole(item.id, "user")}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-orange-600 px-3 py-2 font-semibold text-white"
                    onClick={() => changeRole(item.id, "admin")}
                  >
                    Admin
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

export default AdminUsersPage;
