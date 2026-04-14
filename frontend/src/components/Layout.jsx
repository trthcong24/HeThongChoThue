import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";

function navClassName({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white/70"
  }`;
}

function adminNavClassName({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? "bg-white text-slate-900" : "text-slate-200 hover:bg-slate-700"
  }`;
}

function Layout({ children }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.18),_transparent_24%),linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_100%)] font-body text-slate-800">
      {isAuthenticated && isAdmin ? (
        <header className="sticky top-0 z-30 border-b border-slate-700 bg-slate-900/95 text-white backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <Link to="/admin/dashboard" className="font-display text-2xl font-bold tracking-tight text-white">
              AutoFlow Admin
            </Link>

            <nav className="flex flex-wrap items-center gap-2 rounded-full bg-slate-800 p-2 shadow-sm">
              <NavLink to="/admin/dashboard" className={adminNavClassName}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/vehicles" className={adminNavClassName}>
                Xe
              </NavLink>
              <NavLink to="/admin/space-types" className={adminNavClassName}>
                Dòng xe
              </NavLink>
              <NavLink to="/admin/bookings" className={adminNavClassName}>
                Đơn thuê
              </NavLink>
              <NavLink to="/admin/services" className={adminNavClassName}>
                Dịch vụ
              </NavLink>
              <NavLink to="/admin/users" className={adminNavClassName}>
                Người dùng
              </NavLink>
              <NavLink to="/chat" className={adminNavClassName}>
                Chat hỗ trợ
              </NavLink>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm">
                {user?.fullName}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
            <Link to="/" className="font-display text-2xl font-bold tracking-tight text-slate-900">
              AutoFlow
            </Link>

            <nav className="flex flex-wrap items-center gap-2 rounded-full bg-white/50 p-2 shadow-sm">
              <NavLink to="/" className={navClassName}>
                Trang chủ
              </NavLink>
              <NavLink to="/vehicles" className={navClassName}>
                Xe cho thuê
              </NavLink>
              <NavLink to="/map" className={navClassName}>
                Bản đồ
              </NavLink>
              {isAuthenticated && (
                <NavLink to="/chat" className={navClassName}>
                  Trò chuyện
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/my-bookings" className={navClassName}>
                  Đơn thuê
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/favorites" className={navClassName}>
                  Yêu thích
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink to="/profile" className={navClassName}>
                  Hồ sơ
                </NavLink>
              )}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <div className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                    {user?.fullName}
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navClassName}>
                    Đăng nhập
                  </NavLink>
                  <NavLink to="/register" className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    Đăng ký
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}

export default Layout;
