import { NavLink } from "react-router-dom";

function tabClassName({ isActive }) {
  return `rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
    isActive ? "bg-slate-900 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  }`;
}

function AdminTabs() {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <NavLink to="/admin/dashboard" className={tabClassName}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/spaces" className={tabClassName}>
        Quản lý Space
      </NavLink>
      <NavLink to="/admin/space-types" className={tabClassName}>
        Loại không gian
      </NavLink>
      <NavLink to="/admin/bookings" className={tabClassName}>
        Quản lý Booking
      </NavLink>
      <NavLink to="/admin/services" className={tabClassName}>
        Quản lý Dịch vụ
      </NavLink>
      <NavLink to="/admin/users" className={tabClassName}>
        Quản lý User
      </NavLink>
    </div>
  );
}

export default AdminTabs;
