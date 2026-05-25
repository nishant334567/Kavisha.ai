"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { widgetAwareFetch } from "@/app/lib/widget-session";

const BTN_PRIMARY =
  "rounded-lg bg-highlight px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

function productMeta(p) {
  return [p.status, p.vendor, p.productType, p.price && `$${p.price}`]
    .filter(Boolean)
    .join(" · ");
}

function bulkTrainMessage({ synced, failed }) {
  const parts = [];
  if (synced > 0) parts.push(`Trained ${synced} product${synced === 1 ? "" : "s"}`);
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.join(" · ") || "Nothing to sync";
}

async function apiGet(brand) {
  const res = await widgetAwareFetch(
    `/api/admin/shopify-products?brand=${encodeURIComponent(brand)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load products");
  return data;
}

async function apiTrain(brand, productId) {
  const res = await widgetAwareFetch("/api/admin/shopify-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productId ? { brand, productId } : { brand }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Train failed");
  return data;
}

function StatCard({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-baloo text-2xl font-bold text-foreground">
        {loading ? "—" : value}
      </p>
    </div>
  );
}

function ProductTile({ product, busy, onTrain }) {
  const meta = productMeta(product);
  const training = busy === product.id;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-square border-b border-border bg-muted-bg">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">No image</div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${product.trained
              ? "bg-emerald-500/90 text-white"
              : "border border-border bg-card/95 text-muted"
            }`}
        >
          {product.trained ? "Trained" : "Not trained"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-sm font-semibold text-foreground">
          {product.title || "Untitled"}
        </h2>
        {meta ? <p className="mt-1 line-clamp-2 text-xs text-muted">{meta}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {!product.trained && (
            <button
              type="button"
              onClick={() => onTrain(product.id)}
              disabled={Boolean(busy)}
              className={BTN_PRIMARY}
            >
              {training ? "Training…" : "Train"}
            </button>
          )}
          <a
            href={product.storefrontUrl || product.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-highlight hover:underline"
          >
            Shopify
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function ShopifyProductsPage() {
  const router = useRouter();
  const sub = useBrandContext()?.subdomain || "";

  const [products, setProducts] = useState([]);
  const [shop, setShop] = useState("");
  const [trainedCount, setTrainedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!sub) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(sub);
      setShop(data.shop);
      setProducts(data.products ?? []);
      setTrainedCount(data.trainedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
    } catch (e) {
      setError(e.message);
      setProducts([]);
      setShop("");
      setTrainedCount(0);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [sub]);

  useEffect(() => {
    load();
  }, [load]);

  const total = totalCount || products.length;
  const untrained = Math.max(0, total - trainedCount);

  const train = async (productId) => {
    if (!sub || busy) return;
    setBusy(productId ?? "all");
    setMessage("");
    try {
      const data = await apiTrain(sub, productId);
      if (!productId) setMessage(bulkTrainMessage(data));
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] overflow-y-auto bg-background py-8 text-foreground">
      <div className="mx-auto max-w-6xl px-4 font-baloo md:px-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/admin/${sub}/my-services`)}
            className="rounded-lg border border-border bg-card p-2 hover:bg-muted-bg"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black text-highlight md:text-4xl">Shopify products</h1>
            {shop && <p className="mt-1 text-sm text-muted">{shop}</p>}
          </div>
          {!loading && !error && untrained > 0 && (
            <button
              type="button"
              onClick={() => train()}
              disabled={Boolean(busy)}
              className={BTN_PRIMARY}
            >
              {busy === "all" ? "Training all…" : `Train all (${untrained})`}
            </button>
          )}
        </header>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="In Shopify" value={total} loading={loading} />
          <StatCard label="Trained" value={trainedCount} loading={loading} />
          <StatCard label="Not trained" value={untrained} loading={loading} />
        </div>

        {message && (
          <p className="mb-4 rounded-lg border border-border bg-muted-bg px-3 py-2 text-sm">
            {message}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted">Loading products…</p>
        ) : error ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted">{error}</p>
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
            No products in this store.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductTile key={p.id} product={p} busy={busy} onTrain={train} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
