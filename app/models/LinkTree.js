const mongoose = require("mongoose");

const LinkItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    image: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const LinkTreeSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, unique: true, trim: true, index: true },
    brandName: { type: String, default: "", trim: true },
    title: { type: String, default: "My links", trim: true },
    links: { type: [LinkItemSchema], default: [] },
  },
  { timestamps: true }
);

const LinkTree =
  mongoose.models.LinkTree || mongoose.model("LinkTree", LinkTreeSchema);
module.exports = LinkTree;
