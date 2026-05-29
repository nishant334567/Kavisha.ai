import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getBrandBySubdomain } from "@/app/lib/brandRepository";
import {
  beginShopifyOAuth,
  getShopifySuccessRedirectUrl,
} from "@/app/lib/shopify";
import {
  loadShopifySessionByShop,
  loadShopifySessionByBrand,
  linkShopifyToBrand,
} from "@/app/lib/shopifyRepository";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { searchParams } = new URL(req.url);
      const brand = String(searchParams.get("brand") || "")
        .trim()
        .toLowerCase();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }

      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let shop = normalizeShopifyShopDomain(searchParams.get("shop"));
      if (!shop) {
        const doc = await getBrandBySubdomain(brand);
        shop = normalizeShopifyShopDomain(doc?.shopifyShopUrl);
      }
      if (!shop) {
        const session = await loadShopifySessionByBrand(brand);
        shop = normalizeShopifyShopDomain(session?.shop);
      }
      if (!shop) {
        return NextResponse.json(
          {
            error:
              "Install Kavisha AI from Shopify Admin first, then return here to link your store.",
          },
          { status: 400 }
        );
      }

      const session = await loadShopifySessionByShop(shop);
      if (session?.accessToken) {
        await linkShopifyToBrand(shop, brand);
        return NextResponse.redirect(
          getShopifySuccessRedirectUrl(brand, req, shop),
          302
        );
      }

      return await beginShopifyOAuth(req, { shop, brand });
    },
  });
}
