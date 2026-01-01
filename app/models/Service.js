const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ServiceSchema.index({ brand: 1 });

const Service =
  mongoose.models.Service || mongoose.model("Service", ServiceSchema);
module.exports = Service;
