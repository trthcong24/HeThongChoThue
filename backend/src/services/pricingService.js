function assertValidSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    const error = new Error("Cần ít nhất một khung giờ đặt lịch");
    error.statusCode = 400;
    throw error;
  }

  for (const slot of slots) {
    const startDate = new Date(slot.startAt);
    const endDate = new Date(slot.endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      const error = new Error("Khoảng thời gian đặt lịch không hợp lệ");
      error.statusCode = 400;
      throw error;
    }
  }
}

function calculateSlotPrice(pricingUnit, price, startAt, endAt) {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const durationMs = endDate.getTime() - startDate.getTime();

  if (pricingUnit === "day") {
    const days = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)));
    return { quantity: days, slotPrice: days * Number(price) };
  }

  const hours = Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)));
  return { quantity: hours, slotPrice: hours * Number(price) };
}

module.exports = {
  assertValidSlots,
  calculateSlotPrice
};
