import { NavLink } from "react-router-dom";

function tabClassName({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold ${
    isActive ? "bg-orange-600 text-white" : "border border-slate-200 bg-white text-slate-700"
  }`;
}

function AdminTabs() {
  return (
    <div className="flex flex-wrap gap-3">
      <NavLink to="/admin/spaces" className={tabClassName}>
        Quản lý không gian
      </NavLink>
      <NavLink to="/admin/bookings" className={tabClassName}>
        Quản lý đặt lịch
      </NavLink>
      <NavLink to="/admin/services" className={tabClassName}>
        Quản lý dịch vụ
      </NavLink>
      <NavLink to="/admin/users" className={tabClassName}>
        Quản lý người dùng
      </NavLink>
    </div>
  );
}

export default AdminTabs;
