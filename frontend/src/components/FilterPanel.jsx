const FilterPanel = ({ filters, onChange, onSubmit, onReset }) => {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-[28px] border border-orange-100 bg-white p-5 shadow-panel md:grid-cols-5"
    >
      <input
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none ring-0"
        placeholder="Từ khóa"
        value={filters.keyword}
        onChange={(event) => onChange("keyword", event.target.value)}
      />
      <select
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
        value={filters.type}
        onChange={(event) => onChange("type", event.target.value)}
      >
        <option value="">Tất cả dòng xe</option>
        <option value="meeting_room">SUV</option>
        <option value="desk">Sedan</option>
        <option value="coworking">Hatchback</option>
        <option value="creative_studio">Luxury</option>
      </select>
      <input
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
        placeholder="Vị trí nhận xe"
        value={filters.location}
        onChange={(event) => onChange("location", event.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          placeholder="Giá từ"
          value={filters.minPrice}
          onChange={(event) => onChange("minPrice", event.target.value)}
        />
        <input
          type="number"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          placeholder="Giá đến"
          value={filters.maxPrice}
          onChange={(event) => onChange("maxPrice", event.target.value)}
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="flex-1 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white">
          Lọc
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Xóa bộ lọc
        </button>
      </div>
    </form>
  );
};

export default FilterPanel;
