"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

function productIdFromShopifyDocid(docid) {
  const m = String(docid || "").match(/^shopify-p-(\d+)$/);
  return m ? m[1] : "";
}

/**
 * Single Shopify product citation with add-to-cart.
 */
export default function ProductCard({
  product,
  brand = "",
  fetchFn = fetch,
  primaryHex = null,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!product || typeof product.url !== "string" || !product.url.trim()) {
    return null;
  }

  const brandSub = String(brand || "").trim().toLowerCase();
  const url = product.url.trim();
  const title =
    (typeof product.title === "string" && product.title.trim()) || "Product";
  const desc =
    typeof product.description === "string" ? product.description.trim() : "";
  const price =
    typeof product.price === "string" && product.price.trim()
      ? `$${product.price.trim()}`
      : "";
  const imageUrl =
    typeof product.imageUrl === "string" ? product.imageUrl.trim() : "";

  const addToCart = async () => {
    if (!brandSub || busy || disabled) return;
    setError("");
    setBusy(true);
    try {
      const productId =
        String(product.shopifyProductId || "").replace(/\D/g, "") ||
        productIdFromShopifyDocid(product.docid);
      const res = await fetchFn("/api/shopify/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brandSub,
          productId: productId || undefined,
          docid: product.docid || undefined,
          variantId: product.defaultVariantId || undefined,
          quantity: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not add to cart");
        return;
      }
      if (data.cartUrl) {
        window.open(data.cartUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Could not add to cart");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="flex w-[min(200px,72vw)] shrink-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm dark:border-border/40"
      style={
        primaryHex ? { borderTop: `3px solid ${primaryHex}` } : undefined
      }
    >
      <div className="relative aspect-[4/3] bg-muted-bg">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted">
            Product
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{title}</h3>
        {price ? (
          <p className="mt-0.5 text-xs font-semibold text-foreground">{price}</p>
        ) : null}
        {desc ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{desc}</p>
        ) : null}
        {error ? (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          {brandSub ? (
            <button
              type="button"
              onClick={addToCart}
              disabled={busy || disabled}
              className="w-full rounded-md bg-highlight px-2 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to cart"}
            </button>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 text-[11px] text-highlight hover:underline"
          >
            View on store
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}
