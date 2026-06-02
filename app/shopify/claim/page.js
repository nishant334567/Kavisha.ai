"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Loader from "@/app/components/Loader";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export default function ShopifyClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useFirebaseSession();
  const [error, setError] = useState("");

  const subdomain = String(searchParams.get("subdomain") || "").trim().toLowerCase();
  const shop = normalizeShopifyShopDomain(searchParams.get("shop"));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (typeof window !== "undefined" && subdomain) {
        localStorage.setItem(
          "redirectAfterLogin",
          `/shopify/claim?subdomain=${encodeURIComponent(subdomain)}${
            shop ? `&shop=${encodeURIComponent(shop)}` : ""
          }`
        );
      }
      router.replace("/login");
      return;
    }

    if (!subdomain) {
      setError("Missing avatar subdomain.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/shopify/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subdomain, shop }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Could not claim avatar.");
        }
        if (cancelled) return;
        router.replace(
          `/admin/${encodeURIComponent(subdomain)}/welcome?subdomain=${encodeURIComponent(
            subdomain
          )}${shop ? `&shop=${encodeURIComponent(shop)}` : ""}`
        );
      } catch (e) {
        if (!cancelled) setError(e?.message || "Could not claim avatar.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, router, subdomain, shop]);

  if (loading || (!error && !user)) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!error) {
    return <Loader loadingMessage="Claiming your avatar..." />;
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Couldn&apos;t claim</h1>
      <p className="mt-3 text-sm text-muted">{error}</p>
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted-bg"
        >
          Go home
        </button>
      </div>
    </main>
  );
}

