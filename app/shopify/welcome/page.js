"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/app/components/Loader";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export default function ShopifyWelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shop = normalizeShopifyShopDomain(searchParams.get("shop"));
  const connected = searchParams.get("shopify") === "connected";
  const [checking, setChecking] = useState(Boolean(shop));

  useEffect(() => {
    if (!shop) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/shopify/resolve-brand?shop=${encodeURIComponent(shop)}`
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled || !data?.subdomain) {
          setChecking(false);
          return;
        }
        const q = new URLSearchParams({
          subdomain: data.subdomain,
          shopify: "connected",
          shop,
        });
        router.replace(
          `/admin/${encodeURIComponent(data.subdomain)}/welcome?${q}`
        );
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shop, router]);

  if (checking) {
    return <Loader loadingMessage="Loading your avatar…" />;
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        {connected ? "Shopify connected" : "Kavisha AI × Shopify"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {shop
          ? `Your store ${shop} is authorized. We could not find a linked avatar yet.`
          : "Install the app from Shopify to create your avatar."}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Sign in to Kavisha
        </Link>
        <Link href="/make-avatar" className="text-sm text-highlight hover:underline">
          Create a new avatar
        </Link>
      </div>
    </main>
  );
}
