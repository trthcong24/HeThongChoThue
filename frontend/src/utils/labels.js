export const SPACE_TYPE_LABELS = {
  meeting_room: "Phòng họp",
  desk: "Bàn làm việc",
  coworking: "Khu coworking",
  creative_studio: "Studio sáng tạo",
  private_office: "Văn phòng riêng"
};

export const PRICING_UNIT_LABELS = {
  hour: "giờ",
  day: "ngày"
};

export const PRICING_TYPE_LABELS = {
  per_booking: "mỗi lần đặt",
  per_slot: "mỗi khung giờ"
};

export const BOOKING_STATUS_LABELS = {
  pending: "chờ duyệt",
  confirmed: "đã xác nhận",
  cancelled: "đã hủy"
};

export const ROLE_LABELS = {
  admin: "quản trị viên",
  user: "người dùng"
};

export function getSpaceTypeLabel(value) {
  return SPACE_TYPE_LABELS[value] || value || "-";
}

export function getPricingUnitLabel(value) {
  return PRICING_UNIT_LABELS[value] || value || "-";
}

export function getPricingTypeLabel(value) {
  return PRICING_TYPE_LABELS[value] || value || "-";
}

export function getBookingStatusLabel(value) {
  return BOOKING_STATUS_LABELS[value] || value || "-";
}

export function getRoleLabel(value) {
  return ROLE_LABELS[value] || value || "-";
}
