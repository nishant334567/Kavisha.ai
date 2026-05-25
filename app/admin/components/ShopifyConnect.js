"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { widgetAwareFetch } from "@/app/lib/widget-session";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

const btnPrimary =
  "rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted-bg disabled:opacity-50";
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground disabled:opacity-50";

function getOAuthOrigin() {
  const onStaging =
    (typeof window !== "undefined" && window.location.hostname.includes(".staging.")) ||
    process.env.NEXT_PUBLIC_KAVISHA_SITE_ENV === "staging";
  return onStaging
    ? "https://kavisha.staging.kavisha.ai"
    : process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";
}

export default function ShopifyConnect({ inline = false }) {
  const router = useRouter();
  const brand = useBrandContext();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("shopify") === "connected";

  const [input, setInput] = useState("");
  const [savedShop, setSavedShop] = useState("");
  const [oauthConnected, setOauthConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  const sub = brand?.subdomain || "";
  const productsPath = sub ? `/admin/${sub}/shopify-products` : "";

  const refreshStatus = useCallback(async () => {
    if (!sub) return;
    try {
      const res = await widgetAwareFetch(
        `/api/admin/shopify-shop?brand=${encodeURIComponent(sub)}`
      );
      const data = res.ok ? await res.json() : {};
      const shop = normalizeShopifyShopDomain(data.shopifyShopUrl);
      setSavedShop(shop);
      setInput(data.shopifyShopUrl || shop);
      setOauthConnected(Boolean(data.connected));
    } catch {
      /* keep existing state */
    }
  }, [sub]);

  useEffect(() => {
    const url = brand?.shopifyShopUrl || "";
    setInput(url);
    setSavedShop(normalizeShopifyShopDomain(url));
  }, [brand?.shopifyShopUrl]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, justConnected]);

  const saveShop = useCallback(async () => {
    if (!sub) return;
    setSaving(true);
    setError("");
    try {
      const res = await widgetAwareFetch("/api/admin/shopify-shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: sub, shopifyShopUrl: input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not save store URL");
        return;
      }
      const shop = normalizeShopifyShopDomain(data.shopifyShopUrl);
      setSavedShop(shop);
      setInput(data.shopifyShopUrl || shop);
    } catch {
      setError("Could not save store URL");
    } finally {
      setSaving(false);
    }
  }, [sub, input]);

  const connectShopify = useCallback(() => {
    if (!sub || !savedShop) return;
    const origin = getOAuthOrigin();
    const q = new URLSearchParams({ shop: savedShop, brand: sub });
    window.location.assign(`${origin}/api/shopify/install?${q}`);
  }, [sub, savedShop]);

  const disconnectShopify = useCallback(async () => {
    if (!sub || disconnecting) return;
    setDisconnecting(true);
    setError("");
    try {
      const res = await widgetAwareFetch(
        `/api/admin/shopify-shop?brand=${encodeURIComponent(sub)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not disconnect");
        return;
      }
      setOauthConnected(false);
    } catch {
      setError("Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  }, [sub, disconnecting]);

  if (!brand?.isBrandAdmin) return null;

  const draftShop = normalizeShopifyShopDomain(input);
  const dirty = draftShop !== savedShop;
  const canConnect = Boolean(savedShop) && !dirty && !oauthConnected;

  const body = (
    <>
      {!inline && (
        <p className="mt-1 text-sm text-muted">
          Save your store URL, then connect via Shopify.
        </p>
      )}
      {justConnected && (
        <p
          className={`rounded-lg border border-border bg-muted-bg px-3 py-2 text-sm text-foreground ${inline ? "mt-3" : "mt-4"}`}
        >
          Shopify connected successfully.
        </p>
      )}
      {oauthConnected ? (
        <div className={`space-y-2 ${inline ? "mt-3" : "mt-4"}`}>
          <p className="text-sm text-muted">
            {savedShop ? `Connected to ${savedShop}` : "Store connected"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {productsPath ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push(productsPath)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-highlight transition-colors hover:bg-muted-bg hover:text-foreground"
                  aria-label="View Shopify products"
                  title="View Shopify products"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push(productsPath)}
                  className={btnPrimary}
                >
                  Sync products
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={disconnectShopify}
              disabled={disconnecting}
              className={btnSecondary}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div className={inline ? "mt-3 space-y-2" : "mt-4 space-y-2"}>
          <div>
            <label className="text-xs font-medium text-muted" htmlFor="shopify-shop-url">
              Store URL
            </label>
            <input
              id="shopify-shop-url"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="your-store.myshopify.com"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {dirty && draftShop ? (
            <p className="text-sm text-muted">Save before connecting.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveShop}
              disabled={saving || !draftShop}
              className={btnSecondary}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={connectShopify}
              disabled={!canConnect}
              className={btnPrimary}
            >
              Connect Shopify
            </button>
          </div>
        </div>
      )}
    </>
  );

  const card = (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium uppercase tracking-wider text-foreground">
          Shopify
        </span>
        <span className="text-xs text-muted">Train catalog for chat</span>
      </div>
      {body}
    </div>
  );

  if (inline) return card;

  return (
    <section className="mt-8 w-full max-w-md text-left">{card}</section>
  );
}
