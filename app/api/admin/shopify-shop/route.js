import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  getBrandBySubdomain,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";
import { normalizeShopifyShopDomain } from "@/app/lib/shopifyShopUrl";

export async function PATCH(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const body = await req.json();
      const brand = String(body?.brand || "").trim().toLowerCase();
      const shopifyShopUrl = normalizeShopifyShopDomain(body?.shopifyShopUrl);

      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      if (!shopifyShopUrl) {
        return NextResponse.json(
          { error: "Enter a valid Shopify store (e.g. your-store.myshopify.com)" },
          { status: 400 }
        );
      }

      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await getBrandBySubdomain(brand);
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const updated = await updateBrandBySubdomain(brand, {
        set: { shopifyShopUrl },
      });

      return NextResponse.json({
        ok: true,
        shopifyShopUrl: updated?.shopifyShopUrl || shopifyShopUrl,
      });
    },
  });
}
