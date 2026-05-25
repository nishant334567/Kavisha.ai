import { connectDB } from "@/app/lib/db";
import { Session } from "@shopify/shopify-api";
import ShopifyMerchant from "@/app/models/ShopifyMerchant";

/**
 * Persist offline OAuth session + optional Kavisha brand link.
 * @param {import('@shopify/shopify-api').Session} session
 * @param {string} [brandSubdomain]
 */
export async function saveShopifySession(session, brandSubdomain = "") {
  await connectDB();
  const shop = String(session.shop || "").trim().toLowerCase();
  const brand = String(brandSubdomain || "").trim().toLowerCase();

  await ShopifyMerchant.findOneAndUpdate(
    { shopDomain: shop },
    {
      shopDomain: shop,
      brandSubdomain: brand,
      sessionId: session.id,
      accessToken: session.accessToken,
      scope: session.scope || "",
      isOnline: Boolean(session.isOnline),
      installedAt: new Date(),
      uninstalledAt: null,
    },
    { upsert: true, new: true }
  );
}

/** @returns {import('@shopify/shopify-api').Session | null} */
export async function loadShopifySessionByShop(shopDomain) {
  await connectDB();
  const shop = String(shopDomain || "").trim().toLowerCase();
  const doc = await ShopifyMerchant.findOne({
    shopDomain: shop,
    uninstalledAt: null,
  }).lean();
  if (!doc?.accessToken) return null;
  return new Session({
    id: doc.sessionId,
    shop: doc.shopDomain,
    state: "",
    isOnline: doc.isOnline,
    scope: doc.scope,
    accessToken: doc.accessToken,
  });
}

/** @returns {import('@shopify/shopify-api').Session | null} */
export async function loadShopifySessionByBrand(brandSubdomain) {
  await connectDB();
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const doc = await ShopifyMerchant.findOne({
    brandSubdomain: brand,
    uninstalledAt: null,
  }).lean();
  if (!doc?.accessToken) return null;
  return new Session({
    id: doc.sessionId,
    shop: doc.shopDomain,
    state: "",
    isOnline: doc.isOnline,
    scope: doc.scope,
    accessToken: doc.accessToken,
  });
}

export async function markShopifyUninstalled(shopDomain) {
  await connectDB();
  const shop = String(shopDomain || "").trim().toLowerCase();
  await ShopifyMerchant.updateOne(
    { shopDomain: shop },
    { $set: { uninstalledAt: new Date(), accessToken: "" } }
  );
}

/** Admin disconnect (keeps brand shopifyShopUrl for easy reconnect). */
export async function disconnectShopifyByBrand(brandSubdomain) {
  await connectDB();
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const result = await ShopifyMerchant.updateOne(
    { brandSubdomain: brand, uninstalledAt: null },
    { $set: { uninstalledAt: new Date(), accessToken: "" } }
  );
  return result.modifiedCount > 0;
}
