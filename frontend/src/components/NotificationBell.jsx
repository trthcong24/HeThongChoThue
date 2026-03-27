import { useEffect, useState } from "react";
import api from "../api/client";

function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadData() {
    const response = await api.get("/notifications");
    setItems(response.data);
  }

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener("notification:new", handler);
    window.addEventListener("booking:refresh", handler);

    return () => {
      window.removeEventListener("notification:new", handler);
      window.removeEventListener("booking:refresh", handler);
    };
  }, []);

  async function handleRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item)));
  }

  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-full border border-white/40 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur"
      >
        Thong bao
        {unreadCount > 0 && (
          <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-3 w-80 rounded-3xl border border-orange-100 bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-slate-900">Thong bao</h3>
            <button type="button" className="text-xs text-slate-500" onClick={() => setOpen(false)}>
              Dong
            </button>
          </div>

          <div className="space-y-3">
            {items.length === 0 && <p className="text-sm text-slate-500">Chua co thong bao.</p>}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRead(item.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left ${
                  item.is_read ? "border-slate-200 bg-slate-50" : "border-orange-200 bg-orange-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.message}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
