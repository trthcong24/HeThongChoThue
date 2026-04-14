import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";
import { getBookingStatusLabel, getSpaceTypeLabel } from "../../utils/labels";

function StatCard({ title, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </article>
  );
}

function HorizontalBars({ items, labelKey, valueKey, colorClass }) {
  const maxValue = useMemo(() => {
    if (!items || items.length === 0) {
      return 1;
    }
    return Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
  }, [items, valueKey]);

  return (
    <div className="space-y-3">
      {(items || []).map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0);
        return (
          <div key={`${item[labelKey]}-${value}`}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
              <span>{item[labelKey]}</span>
              <span className="font-semibold">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/dashboard-summary")
      .then((response) => setSummary(response.data))
      .catch((err) => setError(err.response?.data?.message || "Không tải được dữ liệu thống kê"));
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trung tâm quản trị</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Dashboard hệ thống</h1>
      </div>
      <AdminTabs />

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {!summary ? (
        <p className="text-sm text-slate-500">Đang tải thống kê...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng người dùng" value={summary.totals.users.toLocaleString()} />
            <StatCard title="Tổng xe" value={summary.totals.spaces.toLocaleString()} />
            <StatCard title="Tổng đơn đặt" value={summary.totals.bookings.toLocaleString()} />
            <StatCard
              title="Doanh thu đã xác nhận"
              value={`${summary.totals.confirmedRevenue.toLocaleString()} VND`}
              subtitle="Tính từ các đơn confirmed"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Trạng thái đặt lịch</h2>
              <div className="mt-4">
                <HorizontalBars
                  items={(summary.bookingsByStatus || []).map((item) => ({
                    ...item,
                    label: getBookingStatusLabel(item.status)
                  }))}
                  labelKey="label"
                  valueKey="total"
                  colorClass="bg-teal-600"
                />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Phân bố dòng xe</h2>
              <div className="mt-4">
                <HorizontalBars
                  items={(summary.spaceDistribution || []).map((item) => ({
                    ...item,
                    label: item.type_label || getSpaceTypeLabel(item.type)
                  }))}
                  labelKey="label"
                  valueKey="total"
                  colorClass="bg-orange-500"
                />
              </div>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Doanh thu 6 tháng gần nhất</h2>
            <div className="mt-4 space-y-3">
              <HorizontalBars items={summary.monthlyRevenue || []} labelKey="month" valueKey="total" colorClass="bg-violet-600" />
            </div>
          </article>
        </>
      )}
    </section>
  );
}

export default AdminDashboardPage;
