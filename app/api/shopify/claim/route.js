import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { addBrandAdmin, getBrandBySubdomain } from "@/app/lib/brandRepository";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const email = String(decodedToken?.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
      }

      let payload = null;
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }

      const subdomain = String(payload?.subdomain || "")
        .trim()
        .toLowerCase();
      const shop = normalizeShopifyShopDomain(payload?.shop);

      if (!subdomain) {
        return NextResponse.json(
          { error: "subdomain required" },
          { status: 400 }
        );
      }

      const doc = await getBrandBySubdomain(subdomain);
      if (!doc) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      // If the client provided a shop, ensure it matches the stored shopifyShopUrl.
      if (shop) {
        const stored = normalizeShopifyShopDomain(doc.shopifyShopUrl);
        if (stored && stored !== shop) {
          return NextResponse.json(
            { error: "This Shopify store doesn't match this avatar." },
            { status: 403 }
          );
        }
      }

      await addBrandAdmin(subdomain, email);
      return NextResponse.json({ ok: true }, { status: 200 });
    },
    onUnauthenticated: async () => {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    },
  });
}

