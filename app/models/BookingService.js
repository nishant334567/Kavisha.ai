const mongoose = require("mongoose");

const BookingServiceSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    durationUnit: {
      type: String,
      enum: ["Minutes", "Hours"],
      default: "Minutes",
    },
    bufferTime: { type: Number, default: 0 },
    mode: { type: String, default: "Online (Google meet)" },
    cancellationPolicy: { type: String, default: "" },
    price: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BookingServiceSchema.index({ brand: 1 });

const BookingService =
  mongoose.models.BookingService ||
  mongoose.model("BookingService", BookingServiceSchema);

module.exports = BookingService;
