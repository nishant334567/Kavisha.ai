const mongoose = require("mongoose");

const BookingAppointmentSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingService",
      required: true,
    },

    // Snapshot of the service at the time of booking.
    // Stored so changes to the service later don't affect past records.
    serviceSnapshot: {
      title: { type: String, default: "" },
      duration: { type: Number, default: 0 },
      durationUnit: { type: String, default: "Minutes" },
      mode: { type: String, default: "" },
      price: { type: Number, default: 0 },
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: { type: String, required: true },       // "YYYY-MM-DD"
    startTime: { type: String, required: true },   // "HH:MM"
    endTime: { type: String, required: true },     // "HH:MM"

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    totalAmount: { type: Number, required: true },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Query patterns: fetch by brand, by customer, and slot-conflict checks by serviceId+date
BookingAppointmentSchema.index({ brand: 1 });
BookingAppointmentSchema.index({ customerId: 1 });
BookingAppointmentSchema.index({ serviceId: 1, date: 1 });

const BookingAppointment =
  mongoose.models.BookingAppointment ||
  mongoose.model("BookingAppointment", BookingAppointmentSchema);

module.exports = BookingAppointment;
