import { NextResponse } from "next/server";
import {
  beginShopifyOAuth,
  readBrandFromCookie,
  getShopifyWelcomeRedirectUrl,
  getShopifyOnboardingWelcomeUrl,
} from "@/app/lib/shopify";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";
import {
  loadShopifySessionByShop,
  linkShopifyToBrand,
  resolveBrandSubdomainForShop,
} from "@/app/lib/shopifyRepository";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const shop = normalizeShopifyShopDomain(searchParams.get("shop"));
    if (!shop) {
      return NextResponse.json(
        { error: "shop query param required" },
        { status: 400 }
      );
    }

    const brand =
      String(searchParams.get("brand") || "").trim().toLowerCase() ||
      readBrandFromCookie(req);

    let session = null;
    try {
      session = await loadShopifySessionByShop(shop);
    } catch (err) {
      console.error("[shopify auth] session load", err?.message || err);
    }
    if (session?.accessToken) {
      if (brand) {
        await linkShopifyToBrand(shop, brand);
        return NextResponse.redirect(
          getShopifyOnboardingWelcomeUrl(brand, req, shop),
          302
        );
      }
      const linked = await resolveBrandSubdomainForShop(shop);
      if (linked) {
        return NextResponse.redirect(
          getShopifyOnboardingWelcomeUrl(linked, req, shop),
          302
        );
      }
      return NextResponse.redirect(getShopifyWelcomeRedirectUrl(req, shop), 302);
    }

    return await beginShopifyOAuth(req, { shop, brand });
  } catch (err) {
    console.error("[shopify auth]", err);
    return NextResponse.json(
      { error: err?.message || "Shopify auth failed" },
      { status: 500 }
    );
  }
}
