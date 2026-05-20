import "@shopify/shopify-api/adapters/web-api";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { getBrandOrigin } from "@/app/lib/kavishaSiteEnv";

export const SHOPIFY_BRAND_COOKIE = "kavisha_shopify_brand";
export const SHOPIFY_CALLBACK_PATH = "/api/shopify/callback";

const SCOPES = [
  "read_products",
  "read_product_listings",
  "read_inventory",
  "write_checkouts",
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
    scopes: SCOPES,
    hostName,
    hostScheme,
    apiVersion: ApiVersion.January26,
    isEmbeddedApp: false,
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

/** Post-install redirect for a Kavisha brand admin. */
export function getShopifySuccessRedirectUrl(brandSubdomain, request) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  if (brand) {
    return `${getBrandOrigin(brand, { request })}/admin/${encodeURIComponent(brand)}/v2?shopify=connected`;
  }
  return `${getBrandOrigin("kavisha", { request })}/admin/kavisha/v2?shopify=connected`;
}
