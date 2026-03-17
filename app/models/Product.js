const mongoose = require("mongoose");

const DigitalFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    gcsPath: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, default: "" },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    specifications: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
    images: { type: [String], default: [] },
    price: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["physical", "digital"],
      default: "physical",
    },
    digitalFiles: { type: [DigitalFileSchema], default: [] },
  },
  { timestamps: true }
);

ProductSchema.index({ brand: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
module.exports = Product;
