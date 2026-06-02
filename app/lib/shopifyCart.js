import { loadShopifySessionByBrand } from "@/app/lib/shopifyRepository";
import { fetchProduct } from "@/app/lib/shopify/adminGraphql";
import { productIdFromShopifyDocid } from "@/app/lib/shopifyProductIngest";

export const SHOPIFY_COMMERCE_PROMPT = `
**Shopify store (when user asks about products):**
- Recommend only from RELEVANT CONTEXT catalog chunks; do not invent products.
- For buying intent, mention they can use "Add to cart" on product cards (shown separately under Products).
- If size/color/options matter, ask once before they checkout.
- For returns, shipping, policies, or general questions — answer normally without pushing checkout.
`.trim();

/** @param {string} shop @param {string|number} variantId @param {number} [quantity] */
export function buildShopifyCartPermalink(shop, variantId, quantity = 1) {
  const shopHost = String(shop || "").trim().toLowerCase();
  const vid = String(variantId || "").replace(/\D/g, "");
  if (!shopHost || !vid) return "";
  const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
  return `https://${shopHost}/cart/${vid}:${qty}`;
}

/** @param {Array<Record<string, unknown>>} variants @param {string} [variantId] */
function pickPurchasableVariant(variants, variantId) {
  const list = Array.isArray(variants) ? variants : [];
  const wanted = String(variantId || "").replace(/\D/g, "");
  if (wanted) {
    const match = list.find((v) => String(v?.id || "").replace(/\D/g, "") === wanted);
    if (match) return match;
  }
  const inStock = list.find((v) => {
    if (v?.inventory_management !== "shopify") return true;
    const qty = Number(v?.inventory_quantity);
    if (Number.isFinite(qty) && qty > 0) return true;
    return String(v?.inventory_policy || "") === "continue";
  });
  return inStock || list[0] || null;
}

/**
 * @param {string} brandSubdomain
 * @param {{ productId?: string, docid?: string, variantId?: string, quantity?: number }} opts
 */
export async function addToShopifyCartForBrand(brandSubdomain, opts = {}) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const session = await loadShopifySessionByBrand(brand);
  if (!session?.accessToken) {
    return { ok: false, status: 400, error: "Shopify store not connected" };
  }

  let productId = String(opts.productId || "").replace(/\D/g, "");
  if (!productId && opts.docid) {
    productId = productIdFromShopifyDocid(opts.docid);
  }
  if (!productId) {
    return { ok: false, status: 400, error: "Product required" };
  }

  const product = await fetchProduct(session, productId);
  if (!product) {
    return { ok: false, status: 404, error: "Product not found" };
  }

  const variant = pickPurchasableVariant(product.variants, opts.variantId);
  const variantId = variant?.id != null ? String(variant.id).replace(/\D/g, "") : "";
  if (!variantId) {
    return { ok: false, status: 400, error: "No variant available" };
  }

  const cartUrl = buildShopifyCartPermalink(
    session.shop,
    variantId,
    opts.quantity
  );
  if (!cartUrl) {
    return { ok: false, status: 500, error: "Could not build cart link" };
  }

  return {
    ok: true,
    cartUrl,
    shop: session.shop,
    productId,
    variantId,
  };
}
