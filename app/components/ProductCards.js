"use client";

import ProductCard from "@/app/components/ProductCard";

function isShopifyProductCard(item) {
  if (!item) return false;
  if (item.shopifyProductId) return true;
  return String(item.docid || "").startsWith("shopify-p-");
}

/** Legacy logs may still mix products into sourceCards. */
export function partitionCitationCards(sourceCards = [], productCards = []) {
  const kb = [];
  const products = Array.isArray(productCards) ? [...productCards] : [];

  if (products.length > 0) {
    for (const c of sourceCards) {
      if (c && !isShopifyProductCard(c)) kb.push(c);
    }
    return { sourceCards: kb, productCards: products };
  }

  for (const c of sourceCards) {
    if (!c) continue;
    if (isShopifyProductCard(c)) products.push(c);
    else kb.push(c);
  }
  return { sourceCards: kb, productCards: products };
}

/** Horizontal row of Shopify product cards (separate from KB source cards). */
export default function ProductCards({
  items,
  brand = "",
  fetchFn = fetch,
  primaryHex = null,
}) {
  const list = Array.isArray(items)
    ? items.filter((p) => p && typeof p.url === "string" && p.url.trim())
    : [];
  if (list.length === 0) return null;

  return (
    <div className="mt-2 w-full min-w-0 border-t border-border/25 pt-2 dark:border-border/30">
      <p className="mb-1.5 text-xs text-muted">Products</p>
      <div className="-mx-1 flex w-full min-w-0 gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {list.map((product, idx) => (
          <ProductCard
            key={`${product.docid || product.url}-${idx}`}
            product={product}
            brand={brand}
            fetchFn={fetchFn}
            primaryHex={primaryHex}
          />
        ))}
      </div>
    </div>
  );
}
