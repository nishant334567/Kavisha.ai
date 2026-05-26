import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { addToShopifyCartForBrand } from "@/app/lib/shopifyCart";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async () => {
      const body = await req.json().catch(() => ({}));
      const brand = String(body?.brand || "").trim().toLowerCase();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }

      const result = await addToShopifyCartForBrand(brand, {
        productId: body.productId,
        docid: body.docid,
        variantId: body.variantId,
        quantity: body.quantity,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || "Add to cart failed" },
          { status: result.status || 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        cartUrl: result.cartUrl,
        shop: result.shop,
        productId: result.productId,
        variantId: result.variantId,
      });
    },
  });
}
