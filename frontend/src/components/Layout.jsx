import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./NotificationBell";

function navClassName({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white/70"
  }`;
}

function Layout({ children }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.18),_transparent_24%),linear-gradient(180deg,_#fff8ef_0%,_#f8fafc_100%)] font-body text-slate-800">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-slate-900">
            SpaceFlow
          </Link>

          <nav className="flex flex-wrap items-center gap-2 rounded-full bg-white/50 p-2 shadow-sm">
            <NavLink to="/" className={navClassName}>
              Trang chủ
            </NavLink>
            <NavLink to="/spaces" className={navClassName}>
              Không gian
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
                Đặt lịch
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
            {isAdmin && (
              <NavLink to="/admin/spaces" className={navClassName}>
                Quản trị
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

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}

export default Layout;
