const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, default: "" },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    specifications: { type: String, default: "" },
    images: { type: [String], default: [] },
    price: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ brand: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
module.exports = Product;
