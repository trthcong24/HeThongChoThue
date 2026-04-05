import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminTabs from "../../components/AdminTabs";

const initialForm = {
  name: "",
  type: "meeting_room",
  address: "",
  capacity: "",
  pricePerHour: "",
  description: "",
  lat: "",
  lng: "",
  status: "available",
  imageUrls: [""]
};

function AdminSpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [spaceTypes, setSpaceTypes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadData() {
    const [spacesResponse, spaceTypesResponse] = await Promise.all([
      api.get("/admin/spaces"),
      api.get("/admin/space-types")
    ]);
    setSpaces(spacesResponse.data);
    setSpaceTypes(spaceTypesResponse.data);

    setForm((prev) => {
      if (prev.type) {
        return prev;
      }

      return {
        ...prev,
        type: spaceTypesResponse.data[0]?.code || "meeting_room"
      };
    });
  }

  useEffect(() => {
    loadData();
    const refreshHandler = () => loadData();
    window.addEventListener("space:refresh", refreshHandler);

    return () => window.removeEventListener("space:refresh", refreshHandler);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await api.put(`/admin/spaces/${editingId}`, {
          ...form,
          capacity: Number(form.capacity),
          pricePerHour: Number(form.pricePerHour),
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          imageUrls: form.imageUrls.map((url) => url.trim()).filter(Boolean)
        });
        setMessage("Cập nhật Space thành công");
      } else {
        await api.post("/admin/spaces", {
          ...form,
          capacity: Number(form.capacity),
          pricePerHour: Number(form.pricePerHour),
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          imageUrls: form.imageUrls.map((url) => url.trim()).filter(Boolean)
        });
        setMessage("Thêm Space thành công");
      }

      setForm(initialForm);
      setEditingId(null);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Xử lý thất bại");
    }
  }

  function handleEdit(space) {
    setEditingId(space.id);
    setForm({
      name: space.name,
      type: space.type,
      address: space.address,
      capacity: String(space.capacity),
      pricePerHour: String(space.price_per_hour),
      description: space.description || "",
      lat: space.lat || "",
      lng: space.lng || "",
      status: space.status || "available",
      imageUrls: space.images && space.images.length > 0 ? space.images : [""]
    });
  }

  function handleImageChange(index, value) {
    setForm((prev) => {
      const nextImages = [...prev.imageUrls];
      nextImages[index] = value;
      return { ...prev, imageUrls: nextImages };
    });
  }

  function addImageInput() {
    setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ""] }));
  }

  function removeImageInput(index) {
    setForm((prev) => {
      const nextImages = prev.imageUrls.filter((_, i) => i !== index);
      return { ...prev, imageUrls: nextImages.length > 0 ? nextImages : [""] };
    });
  }

  async function handleUploadFromComputer(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        const response = await api.post("/admin/spaces/upload-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        uploadedUrls.push(response.data.url);
      }

      setForm((prev) => {
        const existing = prev.imageUrls.map((url) => url.trim()).filter(Boolean);
        return { ...prev, imageUrls: [...existing, ...uploadedUrls] };
      });
      setMessage("Tải ảnh từ máy tính thành công");
    } catch (error) {
      setMessage(error.response?.data?.message || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bạn chắc chắn muốn xóa Space này?")) {
      return;
    }

    try {
      await api.delete(`/admin/spaces/${id}`);
      setMessage("Xóa Space thành công");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Xóa Space thất bại");
    }
  }

  return (
    <section className="space-y-6">
      <div>
<<<<<<< Updated upstream
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Bảng điều khiển</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quản lý Space</h1>
=======
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trung tâm quản trị</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Quản lý không gian</h1>
>>>>>>> Stashed changes
      </div>
      <AdminTabs />

      <form className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
          <p className="font-semibold text-slate-900">Lưu ý nhập liệu</p>
          <p className="mt-1">Các trường có dấu <span className="text-red-600">*</span> là bắt buộc.</p>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Tên không gian <span className="text-red-600">*</span></span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Loại không gian <span className="text-red-600">*</span></span>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            {spaceTypes.map((type) => (
              <option key={type.id} value={type.code}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Địa chỉ <span className="text-red-600">*</span></span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Sức chứa <span className="text-red-600">*</span></span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            type="number"
            value={form.capacity}
            onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Giá theo giờ (VND) <span className="text-red-600">*</span></span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            type="number"
            value={form.pricePerHour}
            onChange={(event) => setForm((prev) => ({ ...prev, pricePerHour: event.target.value }))}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Trạng thái</span>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="available">Sẵn sàng</option>
            <option value="maintenance">Bảo trì</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Vĩ độ (Lat)</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.lat}
            onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Kinh độ (Lng)</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.lng}
            onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
          />
        </label>

        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-semibold text-slate-700">Ảnh Space</p>
          <p className="text-xs text-slate-500">
            Lưu ý: Link Pinterest/Google page không phải link ảnh trực tiếp nên thường không hiển thị. Nên dùng link kết thúc
            bằng .jpg/.png hoặc tải ảnh từ máy tính.
          </p>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
            {uploading ? "Đang tải ảnh..." : "Tải ảnh từ máy tính"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUploadFromComputer}
              disabled={uploading}
            />
          </label>
          {form.imageUrls.map((image, index) => (
            <div key={`image-${index}`} className="flex gap-2">
              <input
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="https://..."
                value={image}
                onChange={(event) => handleImageChange(index, event.target.value)}
              />
              <button
                type="button"
                onClick={() => removeImageInput(index)}
                className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
              >
                Xóa
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addImageInput}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
          >
            + Thêm URL ảnh
          </button>
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Mô tả</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <button type="submit" className="w-fit rounded-full bg-teal-700 px-5 py-3 font-semibold text-white">
          {editingId ? "Cập nhật" : "Thêm mới"}
        </button>
      </form>

      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

      <div className="overflow-x-auto rounded-[28px] border border-slate-200 bg-white shadow-panel">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Ten</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Địa chỉ</th>
              <th className="px-4 py-3">Sức chứa</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Ảnh</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.name}</td>
<<<<<<< Updated upstream
                <td className="px-4 py-3">{item.type}</td>
=======
                <td className="px-4 py-3">{item.type_label || getSpaceTypeLabel(item.type)}</td>
>>>>>>> Stashed changes
                <td className="px-4 py-3">{item.address}</td>
                <td className="px-4 py-3">{item.capacity}</td>
                <td className="px-4 py-3">{Number(item.price_per_hour).toLocaleString()} VND/gio</td>
                <td className="px-4 py-3">{Array.isArray(item.images) ? item.images.length : 0}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-700"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full border border-red-200 px-3 py-2 font-semibold text-red-600"
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

export default AdminSpacesPage;
