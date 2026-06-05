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

function productLabel(products, productId, title) {
  if (title) return title;
  const p = products.find((x) => String(x.id) === String(productId));
  return p?.title || `Product ${productId}`;
}

function trainResultMessage(data, products, productId) {
  if (data.async) {
    const n = Number(data.queued || 0) + Number(data.skipped || 0);
    return n
      ? `Training ${n} product${n === 1 ? "" : "s"} in background…`
      : "Nothing to train.";
  }

  const errors = Array.isArray(data.errors) ? data.errors : [];
  const { synced = 0, failed = 0 } = data;

  if (!failed) {
    if (synced > 0) return `Trained ${synced} product${synced === 1 ? "" : "s"}.`;
    return "Nothing to train.";
  }

  if (productId && errors.length === 1) return errors[0].message;

  const head =
    synced > 0
      ? `Trained ${synced} · ${failed} failed`
      : `${failed} product${failed === 1 ? "" : "s"} failed`;

  const uniqueMessages = [...new Set(errors.map((e) => e.message))];
  if (uniqueMessages.length === 1) {
    return `${head}\n${uniqueMessages[0]}`;
  }

  const lines = errors.slice(0, 5).map((e) => {
    const label = productLabel(products, e.productId, e.title);
    return `${label} — ${e.message}`;
  });
  if (errors.length > 5) lines.push(`+${errors.length - 5} more`);
  return [head, ...lines].join("\n");
}

function trainResultIsError(data) {
  return !data.async && Number(data.failed) > 0;
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
  const [messageIsError, setMessageIsError] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!sub) return null;
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await apiGet(sub);
      setShop(data.shop);
      setProducts(data.products ?? []);
      setTrainedCount(data.trainedCount ?? 0);
      setTotalCount(data.totalCount ?? 0);
      return data;
    } catch (e) {
      if (!silent) {
        setError(e.message);
        setProducts([]);
        setShop("");
        setTrainedCount(0);
        setTotalCount(0);
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sub]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!polling || !sub) return undefined;
    const id = setInterval(async () => {
      const data = await load({ silent: true });
      if (!data) return;
      const left = Math.max(0, (data.totalCount ?? 0) - (data.trainedCount ?? 0));
      if (left === 0) {
        setPolling(false);
        setMessage("All products trained.");
        setMessageIsError(false);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [polling, sub, load]);

  const total = totalCount || products.length;
  const untrained = Math.max(0, total - trainedCount);

  const train = async (productId) => {
    if (!sub || busy) return;
    setBusy(productId ?? "all");
    setMessage("");
    setMessageIsError(false);
    setPolling(false);
    try {
      const data = await apiTrain(sub, productId);
      const text = trainResultMessage(data, products, productId);
      if (text) {
        setMessage(text);
        setMessageIsError(trainResultIsError(data));
      }
      if (data.async && !productId) {
        setPolling(true);
        await load({ silent: true });
      } else {
        await load();
      }
    } catch (e) {
      setMessage(e.message);
      setMessageIsError(true);
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
          {!loading && !error && (untrained > 0 || polling) && (
            <button
              type="button"
              onClick={() => train()}
              disabled={Boolean(busy) || polling}
              className={BTN_PRIMARY}
            >
              {busy === "all"
                ? "Queueing…"
                : polling
                  ? "Training in background…"
                  : `Train all (${untrained})`}
            </button>
          )}
        </header>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="In Shopify" value={total} loading={loading} />
          <StatCard label="Trained" value={trainedCount} loading={loading} />
          <StatCard label="Not trained" value={untrained} loading={loading} />
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${messageIsError
                ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
                : "border-emerald-500/30 bg-emerald-500/5 text-foreground"
              }`}
          >
            {message}
          </div>
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
