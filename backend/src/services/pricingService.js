function assertValidSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    const error = new Error("At least one booking slot is required");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  for (const slot of slots) {
    const startDate = new Date(slot.startAt);
    const endDate = new Date(slot.endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      const error = new Error("Khung giờ đặt lịch không hợp lệ");
      error.statusCode = 400;
      throw error;
    }

    if (startDate <= now) {
      const error = new Error("Không thể đặt lịch cho thời gian trong quá khứ");
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
