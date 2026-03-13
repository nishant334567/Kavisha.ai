const mongoose = require("mongoose");

const intervalSchema = new mongoose.Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } },
  { _id: false }
);

const dayScheduleSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 }, // 0=Sun … 6=Sat
    enabled: { type: Boolean, default: false },
    intervals: { type: [intervalSchema], default: [] },
  },
  { _id: false }
);

const dateOverrideSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    isClosed: { type: Boolean, default: false },
    intervals: { type: [intervalSchema], default: [] },
  },
  { _id: false }
);

const BookingAvailabilitySchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, unique: true },
    timezone: { type: String, default: "Asia/Kolkata" },

    weeklySchedule: {
      type: [dayScheduleSchema],
      default: () => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, enabled: false, intervals: [] })),
    },

    dateOverrides: { type: [dateOverrideSchema], default: [] },

    rules: {
      slotStepMinutes: { type: Number, default: 15 },
      minNoticeMinutes: { type: Number, default: 120 },
      maxAdvanceDays: { type: Number, default: 60 },
    },
  },
  { timestamps: true }
);

const BookingAvailability =
  mongoose.models.BookingAvailability ||
  mongoose.model("BookingAvailability", BookingAvailabilitySchema);

module.exports = BookingAvailability;
