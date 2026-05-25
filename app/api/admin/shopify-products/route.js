import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  listShopifyProductsForBrand,
  syncShopifyProductsForBrand,
} from "@/app/lib/shopifyProductIngest";

export const maxDuration = 300;

async function guardBrandAdmin(email, brand) {
  if (!brand) {
    return NextResponse.json({ error: "brand required" }, { status: 400 });
  }
  if (!(await isBrandAdmin(email, brand))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function notConnected() {
  return NextResponse.json(
    { error: "Connect Shopify first" },
    { status: 400 }
  );
}

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      const denied = await guardBrandAdmin(decodedToken.email, brand);
      if (denied) return denied;

      const result = await listShopifyProductsForBrand(brand);
      return result ? NextResponse.json(result) : notConnected();
    },
  });
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const body = await req.json().catch(() => ({}));
      const brand = body.brand || new URL(req.url).searchParams.get("brand");
      const denied = await guardBrandAdmin(decodedToken.email, brand);
      if (denied) return denied;

      const productId =
        body.productId != null ? String(body.productId).replace(/\D/g, "") : "";
      const result = await syncShopifyProductsForBrand(brand, productId || undefined);
      return result ? NextResponse.json(result) : notConnected();
    },
  });
}
