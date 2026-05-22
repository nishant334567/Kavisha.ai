import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  listShopifyProductsForBrand,
  syncUntrainedShopifyProductsForBrand,
} from "@/app/lib/shopifyProductIngest";

export const maxDuration = 300;

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

      const result = await listShopifyProductsForBrand(brand);
      if (!result) {
        return NextResponse.json(
          { error: "Connect Shopify first" },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const body = await req.json().catch(() => ({}));
      const brand = body.brand || new URL(req.url).searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await syncUntrainedShopifyProductsForBrand(brand);
      if (!result) {
        return NextResponse.json(
          { error: "Connect Shopify first" },
          { status: 400 }
        );
      }
      return NextResponse.json(result);
    },
  });
}
