"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function ShopifyProductsPage() {
  const router = useRouter();
  const brand = useBrandContext();
  const sub = brand?.subdomain || "";

  const [products, setProducts] = useState([]);
  const [shop, setShop] = useState("");
  const [trainedCount, setTrainedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const loadProducts = useCallback(async () => {
    if (!sub) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/shopify-products?brand=${encodeURIComponent(sub)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load products");
        setProducts([]);
        setShop("");
        setTrainedCount(0);
        setTotalCount(0);
        return;
      }
      setShop(data.shop);
      setProducts(data.products ?? []);
      setTrainedCount(data.trainedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
    } catch {
      setError("Could not load products");
    } finally {
      setLoading(false);
    }
  }, [sub]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const untrainedCount = Math.max(0, totalCount - trainedCount);

  const syncUntrained = async () => {
    if (!sub || syncing || untrainedCount === 0) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/shopify-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: sub }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error || "Sync failed");
        return;
      }
      const parts = [];
      if (data.synced > 0) parts.push(`Trained ${data.synced} product${data.synced === 1 ? "" : "s"}`);
      if (data.failed > 0) parts.push(`${data.failed} failed`);
      setSyncMessage(parts.join(" · ") || "Nothing to sync");
      await loadProducts();
    } catch {
      setSyncMessage("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="px-8 py-8">
      <button
        type="button"
        onClick={() => router.push(`/admin/${sub}/my-services`)}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-baloo text-xl font-bold text-foreground">
          Shopify products
        </h1>
        {!loading && !error && totalCount > 0 ? (
          <button
            type="button"
            onClick={syncUntrained}
            disabled={syncing || untrainedCount === 0}
            className="rounded-lg bg-[#95bf47] px-4 py-2 text-sm font-medium text-[#1a3d0a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? "Syncing…" : `Sync untrained (${untrainedCount})`}
          </button>
        ) : null}
      </div>

      {(shop || (!loading && !error && totalCount > 0)) && (
        <p className="mb-2 text-sm text-muted">
          {[shop, !loading && !error && totalCount > 0 && `${trainedCount}/${totalCount} trained in knowledge base`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {syncMessage ? (
        <p className="mb-6 text-sm text-foreground">{syncMessage}</p>
      ) : (
        <div className="mb-6" />
      )}
      {!shop && !syncMessage && (loading || error || totalCount === 0) && (
        <div className="mb-6" />
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-muted">{error}</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted">No products in this store.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {products.map((p) => (
            <li key={p.id} className="flex gap-4 p-4">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-lg border border-border bg-muted-bg" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.trained
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        : "bg-muted-bg text-muted"
                    }`}
                  >
                    {p.trained ? "Trained" : "Not trained"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {[p.status, p.vendor, p.productType, p.price != null && p.price !== "" ? `$${p.price}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <a
                  href={p.storefrontUrl || p.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-highlight hover:underline"
                >
                  View in Shopify
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
