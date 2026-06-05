"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { widgetAwareFetch } from "@/app/lib/widget-session";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

const btnPrimary =
  "rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted-bg disabled:opacity-50";

export default function ShopifyConnect({ inline = false }) {
  const router = useRouter();
  const brand = useBrandContext();

  const [savedShop, setSavedShop] = useState("");
  const [oauthConnected, setOauthConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  const sub = brand?.subdomain || "";
  const shopLinked = Boolean(String(brand?.shopifyShopUrl || "").trim());
  const productsPath = sub
    ? `/admin/${sub}/shopify-products?subdomain=${encodeURIComponent(sub)}`
    : "";

  const refreshStatus = useCallback(async () => {
    if (!sub) return;
    try {
      const res = await widgetAwareFetch(
        `/api/admin/shopify-shop?brand=${encodeURIComponent(sub)}`
      );
      const data = res.ok ? await res.json() : {};
      const shop = normalizeShopifyShopDomain(data.shopifyShopUrl);
      setSavedShop(shop);
      setOauthConnected(Boolean(data.connected));
    } catch {
      /* keep existing state */
    }
  }, [sub]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

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
      setSavedShop("");
    } catch {
      setError("Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  }, [sub, disconnecting]);

  if (!brand?.isBrandAdmin) return null;

  const shopLabel = savedShop || brand?.shopifyShopUrl;

  const body = (
    <>
      {!inline && (
        <p className="mt-1 text-sm text-muted">
          Install or open Kavisha AI from Shopify Admin to connect your store.
        </p>
      )}
      {oauthConnected ? (
        <div className={`space-y-2 ${inline ? "mt-3" : "mt-4"}`}>
          <p className="text-sm text-muted">
            {shopLabel ? `Connected to ${shopLabel}` : "Store connected"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {productsPath ? (
              <button
                type="button"
                onClick={() => router.push(productsPath)}
                className={btnPrimary}
              >
                View &amp; train products
              </button>
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
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <p className="text-sm text-muted">
            {shopLinked
              ? `Store ${shopLabel || "linked"}. Open Kavisha AI from Shopify Admin to refresh access.`
              : "Install Kavisha AI from your Shopify store admin, then return here."}
          </p>
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
        <span className="text-xs text-muted">Product catalog for chat</span>
      </div>
      {body}
    </div>
  );

  if (inline) return card;

  return (
    <section className="mt-8 w-full max-w-md text-left">{card}</section>
  );
}
