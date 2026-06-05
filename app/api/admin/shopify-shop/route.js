import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getBrandBySubdomain } from "@/app/lib/brandRepository";
import {
  loadShopifySessionByBrand,
  disconnectShopifyByBrand,
} from "@/app/lib/shopifyRepository";
export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const doc = await getBrandBySubdomain(brand);
      let session = null;
      try {
        session = await loadShopifySessionByBrand(brand);
      } catch (err) {
        console.error("[shopify-shop] session load", err?.message || err);
      }
      const shop = doc?.shopifyShopUrl || session?.shop || "";
      return NextResponse.json({
        shopifyShopUrl: shop,
        connected: Boolean(session?.accessToken),
      });
    },
  });
}

export async function DELETE(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await disconnectShopifyByBrand(brand);
      const doc = await getBrandBySubdomain(brand);
      return NextResponse.json({
        ok: true,
        connected: false,
        shopifyShopUrl: doc?.shopifyShopUrl || "",
      });
    },
  });
}
