import { NextResponse } from "next/server";
import { syncShopifyProductsForBrand } from "@/app/lib/shopifyProductIngest";

export const maxDuration = 120;

export async function POST(request) {
  const secret = process.env.TASKS_SECRET;
  if (secret && request.headers.get("x-tasks-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const brand = String(body.brand || "").trim().toLowerCase();
  const productId = String(body.productId || "").replace(/\D/g, "");
  if (!brand || !productId) {
    return NextResponse.json({ error: "brand and productId required" }, { status: 400 });
  }

  const result = await syncShopifyProductsForBrand(brand, productId);
  if (!result) {
    return NextResponse.json({ error: "Shop not connected" }, { status: 400 });
  }
  if (result.failed) {
    return NextResponse.json(
      { error: result.errors?.[0]?.message || "Training failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
