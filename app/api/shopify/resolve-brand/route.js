import { NextResponse } from "next/server";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";
import { resolveBrandSubdomainForShop } from "@/app/lib/shopifyRepository";

export async function GET(req) {
  const shop = normalizeShopifyShopDomain(
    new URL(req.url).searchParams.get("shop")
  );
  if (!shop) {
    return NextResponse.json({ error: "shop required" }, { status: 400 });
  }
  const subdomain = await resolveBrandSubdomainForShop(shop);
  return NextResponse.json({ subdomain: subdomain || null });
}
