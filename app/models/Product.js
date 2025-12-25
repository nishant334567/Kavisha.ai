const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ProductSchema.index({ brand: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
module.exports = Product;
