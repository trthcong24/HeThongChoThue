const pool = require("../config/db");
const env = require("../config/env");
const { createNotification } = require("./notificationService");

let intervalRef = null;

async function pushUpcomingReminders() {
  const [rows] = await pool.query(
    `SELECT bs.id, bs.start_at, b.user_id, s.name AS space_name
     FROM booking_slots bs
     JOIN bookings b ON b.id = bs.booking_id
     JOIN spaces s ON s.id = b.space_id
     WHERE b.status = 'confirmed'
       AND bs.reminder_sent_at IS NULL
       AND bs.start_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MINUTE)`,
    [env.reminderLeadMinutes]
  );

  for (const row of rows) {
    await createNotification({
      userId: row.user_id,
      type: "reminder",
      title: "Sap den gio thue",
      message: `Khong gian ${row.space_name} sap den gio su dung.`,
      metadata: {
        bookingSlotId: row.id,
        startAt: row.start_at
      }
    });

    await pool.query("UPDATE booking_slots SET reminder_sent_at = NOW() WHERE id = ?", [row.id]);
  }
}

function startReminderScheduler() {
  if (intervalRef) {
    return;
  }

  intervalRef = setInterval(() => {
    pushUpcomingReminders().catch((error) => {
      console.error("Reminder scheduler error", error);
    });
  }, 60 * 1000);
}

module.exports = {
  startReminderScheduler,
  pushUpcomingReminders
};
