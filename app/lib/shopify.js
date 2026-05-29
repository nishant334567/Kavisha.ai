import "@shopify/shopify-api/adapters/web-api";
import { shopifyApi, ApiVersion, DeliveryMethod } from "@shopify/shopify-api";
import { getBrandOrigin } from "@/app/lib/kavishaSiteEnv";

export const SHOPIFY_BRAND_COOKIE = "kavisha_shopify_brand";
export const SHOPIFY_CALLBACK_PATH = "/api/shopify/callback";
export const SHOPIFY_WEBHOOK_PATH = "/api/shopify/webhooks";

const httpWebhook = {
  deliveryMethod: DeliveryMethod.Http,
  callbackUrl: SHOPIFY_WEBHOOK_PATH,
  callback: async () => {},
};

/** Register product + uninstall webhooks for this shop (after OAuth). */
export async function registerShopifyWebhooks(shopify, session) {
  if (!session?.accessToken) return;
  if (!shopify._webhooksReady) {
    shopify.webhooks.addHandlers({
      PRODUCTS_CREATE: [httpWebhook],
      PRODUCTS_UPDATE: [httpWebhook],
      PRODUCTS_DELETE: [httpWebhook],
      APP_UNINSTALLED: [httpWebhook],
    });
    shopify._webhooksReady = true;
  }
  return shopify.webhooks.register({ session });
}

export const SHOPIFY_SCOPES = [
  "read_products",
  "read_product_listings",
  "read_inventory",
];

/** Host + scheme for OAuth redirect_uri (must match Partner Dashboard). */
export function getShopifyAppHost(request) {
  const forwardedHost = request?.headers?.get?.("x-forwarded-host");
  const host =
    forwardedHost ||
    request?.headers?.get?.("host") ||
    process.env.SHOPIFY_APP_HOST ||
    (process.env.SHOPIFY_APP_URL
      ? new URL(process.env.SHOPIFY_APP_URL).host
      : null) ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
      : "kavisha.ai");
  const hostname = String(host).split(",")[0].trim();
  const scheme =
    request?.headers?.get?.("x-forwarded-proto") ||
    (hostname.includes("localhost") ? "http" : "https");
  return { hostName: hostname, hostScheme: scheme === "http" ? "http" : "https" };
}

/** @param {Request} [request] */
export function getShopify(request) {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const apiSecretKey = process.env.SHOPIFY_API_SECRET || "";
  if (!apiKey || !apiSecretKey) {
    throw new Error(
      "Shopify app credentials missing (SHOPIFY_API_KEY and SHOPIFY_API_SECRET)"
    );
  }

  const { hostName, hostScheme } = getShopifyAppHost(request);

  return shopifyApi({
    apiKey,
    apiSecretKey,
    scopes: SHOPIFY_SCOPES,
    hostName,
    hostScheme,
    apiVersion: ApiVersion.January26,
    isEmbeddedApp: false,
    /**
     * Shopify Admin API now requires expiring offline tokens for new public apps.
     * This enables refresh-token based offline sessions (60-min access token TTL).
     */
    expiringOfflineAccessTokens: true,
  });
}

export function appendBrandCookie(response, brand, request) {
  const sub = String(brand || "").trim().toLowerCase();
  if (!sub) return response;

  const { hostScheme } = getShopifyAppHost(request);
  const secure = hostScheme === "https" ? "; Secure" : "";
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${SHOPIFY_BRAND_COOKIE}=${encodeURIComponent(sub)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function readBrandFromCookie(request) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(
    new RegExp(`(?:^|;\\s*)${SHOPIFY_BRAND_COOKIE}=([^;]*)`)
  );
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    return "";
  }
}

export function clearBrandCookie(request) {
  const { hostScheme } = getShopifyAppHost(request);
  const secure = hostScheme === "https" ? "; Secure" : "";
  return `${SHOPIFY_BRAND_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Start OAuth; `shop` must come from Shopify (install) or an existing linked store. */
export async function beginShopifyOAuth(req, { shop, brand }) {
  const shopify = getShopify(req);
  const beginResponse = await shopify.auth.begin({
    shop,
    callbackPath: SHOPIFY_CALLBACK_PATH,
    isOnline: false,
    rawRequest: req,
  });
  return appendBrandCookie(beginResponse, brand, req);
}

/** Public onboarding after install when no Kavisha brand is linked yet. */
export function getShopifyWelcomeRedirectUrl(request, shop) {
  const origin = getBrandOrigin("kavisha", { request });
  const params = new URLSearchParams({ shopify: "connected" });
  const shopHost = String(shop || "").trim().toLowerCase();
  if (shopHost) params.set("shop", shopHost);
  return `${origin}/shopify/welcome?${params}`;
}

/** Post-install redirect for a Kavisha brand admin. */
export function getShopifySuccessRedirectUrl(brandSubdomain, request, shop) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const origin = brand
    ? getBrandOrigin(brand, { request })
    : getBrandOrigin("kavisha", { request });
  const path = brand
    ? `/admin/${encodeURIComponent(brand)}/my-services`
    : "/admin/kavisha/my-services";
  const params = new URLSearchParams({ shopify: "connected" });
  const shopHost = String(shop || "").trim().toLowerCase();
  if (shopHost) params.set("shop", shopHost);
  return `${origin}${path}?${params}`;
}
