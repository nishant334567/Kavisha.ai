"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { widgetAwareFetch } from "@/app/lib/widget-session";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

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
        <p className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200">
          Shopify connected successfully.
        </p>
      )}
      {oauthConnected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">
            {savedShop ? `Connected to ${savedShop}` : "Store connected"}
          </p>
          {productsPath ? (
            <button
              type="button"
              onClick={() => router.push(productsPath)}
              className="rounded-lg bg-[#95bf47] px-4 py-2 text-sm font-medium text-[#1a3d0a]"
            >
              Sync products
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <label
            className={`block text-sm text-foreground ${inline ? "mt-3" : "mt-4"}`}
            htmlFor="shopify-shop-url"
          >
            Store URL
          </label>
          <input
            id="shopify-shop-url"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="your-store.myshopify.com"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            autoComplete="off"
          />
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {dirty && draftShop ? (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
              Save before connecting.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveShop}
              disabled={saving || !draftShop}
              className="rounded-lg border border-border bg-muted-bg px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={connectShopify}
              disabled={!canConnect}
              className="rounded-lg bg-[#95bf47] px-4 py-2 text-sm font-medium text-[#1a3d0a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Connect Shopify
            </button>
          </div>
        </>
      )}
    </>
  );

  if (inline) {
    return <div className="mt-3">{body}</div>;
  }

  return (
    <section className="mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
      <h2 className="font-baloo text-lg uppercase tracking-wide text-foreground">
        Shopify
      </h2>
      {body}
    </section>
  );
}
