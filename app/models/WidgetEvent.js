import mongoose from "mongoose";

const WidgetEventSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    event: {
      type: String,
      required: true,
      enum: ["widget_impression", "widget_open"],
    },
    pageUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

WidgetEventSchema.index({ brand: 1, event: 1, createdAt: -1 });

const WidgetEvent =
  mongoose.models.WidgetEvent ||
  mongoose.model("WidgetEvent", WidgetEventSchema);

export default WidgetEvent;
