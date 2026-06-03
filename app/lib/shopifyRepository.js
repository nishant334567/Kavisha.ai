import { connectDB } from "@/app/lib/db";
import ShopifyMerchant from "@/app/models/ShopifyMerchant";
import { getShopify } from "@/app/lib/shopify";
import {
  getBrandByShopifyShopUrl,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";

const ACCESS_TOKEN_SKEW_MS = 2 * 60 * 1000; // refresh a little before expiry

/**
 * Persist offline OAuth session + optional Kavisha brand link.
 * @param {import('@shopify/shopify-api').Session} session
 * @param {string} [brandSubdomain]
 */
export async function saveShopifySession(session, brandSubdomain = "") {
  await connectDB();
  const shop = String(session.shop || "").trim().toLowerCase();
  const brand = String(brandSubdomain || "").trim().toLowerCase();

  const expiresAt =
    session?.expires instanceof Date
      ? session.expires
      : session?.expires
        ? new Date(session.expires)
        : null;
  const refreshTokenExpiresAt =
    session?.refreshTokenExpires instanceof Date
      ? session.refreshTokenExpires
      : session?.refreshTokenExpires
        ? new Date(session.refreshTokenExpires)
        : null;

  const $set = {
    shopDomain: shop,
    sessionId: session.id,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken || "",
    accessTokenExpiresAt: expiresAt,
    refreshTokenExpiresAt,
    scope: session.scope || "",
    isOnline: Boolean(session.isOnline),
    installedAt: new Date(),
    uninstalledAt: null,
  };
  if (brand) $set.brandSubdomain = brand;

  await ShopifyMerchant.findOneAndUpdate(
    { shopDomain: shop },
    { $set },
    { upsert: true, new: true }
  );
}

/** Kavisha avatar subdomain linked to a Shopify shop (brands collection or merchant row). */
export async function resolveBrandSubdomainForShop(shopDomain) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  if (!shop) return "";

  const brandDoc = await getBrandByShopifyShopUrl(shop);
  const fromBrand = String(brandDoc?.subdomain || "").trim().toLowerCase();
  if (fromBrand) return fromBrand;

  const merchant = await loadMerchantByShop(shop);
  return String(merchant?.brandSubdomain || "").trim().toLowerCase();
}

async function loadMerchantByShop(shopDomain) {
  await connectDB();
  const shop = String(shopDomain || "").trim().toLowerCase();
  return await ShopifyMerchant.findOne({
    shopDomain: shop,
    uninstalledAt: null,
  }).lean();
}

async function loadMerchantByBrand(brandSubdomain) {
  await connectDB();
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  return await ShopifyMerchant.findOne({
    brandSubdomain: brand,
    uninstalledAt: null,
  }).lean();
}

function tokenNeedsRefresh(expiresAt) {
  if (!expiresAt) return false; // legacy non-expiring tokens (but may be rejected)
  const ts = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return Number.isFinite(ts) && ts - Date.now() <= ACCESS_TOKEN_SKEW_MS;
}

async function migrateOrRefreshMerchant(doc) {
  if (!doc?.shopDomain || !doc?.accessToken) return doc;

  const shopify = getShopify();

  // Shopify is now rejecting legacy non-expiring offline tokens (shpat_...) for Admin API.
  const looksLegacyNonExpiring = String(doc.accessToken).startsWith("shpat_");
  const hasRefresh = Boolean(doc.refreshToken);

  if (looksLegacyNonExpiring && !hasRefresh) {
    const { session } = await shopify.auth.migrateToExpiringToken({
      shop: doc.shopDomain,
      nonExpiringOfflineAccessToken: doc.accessToken,
    });
    await saveShopifySession(session, doc.brandSubdomain);
    return await loadMerchantByShop(doc.shopDomain);
  }

  if (hasRefresh && tokenNeedsRefresh(doc.accessTokenExpiresAt)) {
    const { session } = await shopify.auth.refreshToken({
      shop: doc.shopDomain,
      refreshToken: doc.refreshToken,
    });
    await saveShopifySession(session, doc.brandSubdomain);
    return await loadMerchantByShop(doc.shopDomain);
  }

  return doc;
}

/** Plain session shape — `new Session()` breaks in Next.js prod bundles. */
function sessionFromMerchant(doc) {
  if (!doc?.accessToken) return null;
  const session = {
    id: doc.sessionId || `offline_${doc.shopDomain}`,
    shop: doc.shopDomain,
    state: "",
    isOnline: Boolean(doc.isOnline),
    scope: doc.scope || "",
    accessToken: doc.accessToken,
  };
  if (doc.refreshToken) session.refreshToken = doc.refreshToken;
  if (doc.accessTokenExpiresAt) {
    session.expires = new Date(doc.accessTokenExpiresAt);
  }
  if (doc.refreshTokenExpiresAt) {
    session.refreshTokenExpires = new Date(doc.refreshTokenExpiresAt);
  }
  return session;
}

/** @returns {import('@shopify/shopify-api').Session | null} */
export async function loadShopifySessionByShop(shopDomain) {
  const doc = await loadMerchantByShop(shopDomain);
  if (!doc?.accessToken) return null;
  const updated = await migrateOrRefreshMerchant(doc);
  return sessionFromMerchant(updated);
}

/** @returns {import('@shopify/shopify-api').Session | null} */
export async function loadShopifySessionByBrand(brandSubdomain) {
  const doc = await loadMerchantByBrand(brandSubdomain);
  if (!doc?.accessToken) return null;
  const updated = await migrateOrRefreshMerchant(doc);
  return sessionFromMerchant(updated);
}

export async function markShopifyUninstalled(shopDomain) {
  await connectDB();
  const shop = String(shopDomain || "").trim().toLowerCase();
  await ShopifyMerchant.updateOne(
    { shopDomain: shop },
    {
      $set: {
        uninstalledAt: new Date(),
        accessToken: "",
        refreshToken: "",
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      },
    }
  );
}

/** Attach an OAuth'd shop to a Kavisha brand (after install or reconnect). */
export async function linkShopifyToBrand(shopDomain, brandSubdomain) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  if (!shop || !brand) return false;

  await connectDB();
  const result = await ShopifyMerchant.findOneAndUpdate(
    { shopDomain: shop, uninstalledAt: null },
    { $set: { brandSubdomain: brand } }
  );
  if (!result) return false;

  await updateBrandBySubdomain(brand, { set: { shopifyShopUrl: shop } });
  return true;
}

/** Admin disconnect (keeps brand shopifyShopUrl for easy reconnect). */
export async function disconnectShopifyByBrand(brandSubdomain) {
  await connectDB();
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const result = await ShopifyMerchant.updateOne(
    { brandSubdomain: brand, uninstalledAt: null },
    {
      $set: {
        uninstalledAt: new Date(),
        accessToken: "",
        refreshToken: "",
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
      },
    }
  );
  return result.modifiedCount > 0;
}
