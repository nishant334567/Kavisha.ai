import { NextResponse } from "next/server";
import {
  getShopify,
  SHOPIFY_CALLBACK_PATH,
  appendBrandCookie,
} from "@/app/lib/shopify";
import { getBrandBySubdomain } from "@/app/lib/brandRepository";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = normalizeShopifyShopDomain(searchParams.get("shop"));
    const brand = String(searchParams.get("brand") || "").trim().toLowerCase();

    if (!shop) {
      return NextResponse.json({ error: "Valid shop query param required" }, { status: 400 });
    }
    if (!brand) {
      return NextResponse.json({ error: "brand query param required" }, { status: 400 });
    }

    const brandDoc = await getBrandBySubdomain(brand);
    const saved = normalizeShopifyShopDomain(brandDoc?.shopifyShopUrl);
    if (!saved || saved !== shop) {
      return NextResponse.json(
        { error: "Save your Shopify store URL in admin before connecting" },
        { status: 400 }
      );
    }

    const shopify = getShopify(req);
    const beginResponse = await shopify.auth.begin({
      shop,
      callbackPath: SHOPIFY_CALLBACK_PATH,
      isOnline: false,
      rawRequest: req,
    });

    const response = appendBrandCookie(beginResponse, brand, req);
    return response;
  } catch (err) {
    console.error("[shopify install]", err);
    return NextResponse.json(
      { error: err?.message || "Shopify install failed" },
      { status: 500 }
    );
  }
}
