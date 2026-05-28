const mongoose = require("mongoose");

const ShopifyMerchantSchema = new mongoose.Schema(
  {
    shopDomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    brandSubdomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    sessionId: { type: String, required: true, trim: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: "" },
    accessTokenExpiresAt: { type: Date, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    scope: { type: String, default: "" },
    isOnline: { type: Boolean, default: false },
    installedAt: { type: Date, default: Date.now },
    uninstalledAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "shopify_merchants" }
);

ShopifyMerchantSchema.index({ shopDomain: 1 }, { unique: true });
ShopifyMerchantSchema.index({ brandSubdomain: 1 });

const ShopifyMerchant =
  mongoose.models.ShopifyMerchant ||
  mongoose.model("ShopifyMerchant", ShopifyMerchantSchema);

module.exports = ShopifyMerchant;
