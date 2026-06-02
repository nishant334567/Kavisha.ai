"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export default function ShopifyWelcomePage() {
  const searchParams = useSearchParams();
  const { user } = useFirebaseSession();
  const shop = normalizeShopifyShopDomain(searchParams.get("shop"));
  const connected = searchParams.get("shopify") === "connected";

  const loginHref = shop
    ? `/login?shop=${encodeURIComponent(shop)}`
    : "/login";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        {connected ? "Shopify connected" : "Kavisha AI × Shopify"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {shop
          ? `Your store ${shop} is authorized. Sign in to link it to your Kavisha avatar.`
          : "Sign in to finish linking your store to Kavisha."}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {!user ? (
          <Link
            href={loginHref}
            className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Sign in to Kavisha
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Open My Services on your brand admin and use Connect Shopify.
          </p>
        )}
        <Link href="/make-avatar" className="text-sm text-highlight hover:underline">
          Create a new avatar
        </Link>
      </div>
    </main>
  );
}
