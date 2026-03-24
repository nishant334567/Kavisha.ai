const mongoose = require("mongoose");

const LinkItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    image: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/** One social profile: show only when enabled and url is set */
const SocialEntrySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    url: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const LinkTreeSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, unique: true, trim: true, index: true },
    brandName: { type: String, default: "", trim: true },
    title: { type: String, default: "My links", trim: true },
    links: { type: [LinkItemSchema], default: [] },
    social: {
      youtube: { type: SocialEntrySchema, default: () => ({ enabled: false, url: "" }) },
      linkedin: { type: SocialEntrySchema, default: () => ({ enabled: false, url: "" }) },
      twitter: { type: SocialEntrySchema, default: () => ({ enabled: false, url: "" }) },
      instagram: { type: SocialEntrySchema, default: () => ({ enabled: false, url: "" }) },
      facebook: { type: SocialEntrySchema, default: () => ({ enabled: false, url: "" }) },
    },
  },
  { timestamps: true }
);

const LinkTree =
  mongoose.models.LinkTree || mongoose.model("LinkTree", LinkTreeSchema);
module.exports = LinkTree;
