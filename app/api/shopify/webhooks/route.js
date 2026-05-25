import { NextResponse } from "next/server";
import {
  verifyShopifyWebhookHmac,
  handleShopifyWebhook,
} from "@/app/lib/shopify/shopifyWebhooks";

export async function POST(req) {
  const rawBody = await req.text();
  if (!verifyShopifyWebhookHmac(rawBody, req.headers.get("x-shopify-hmac-sha256"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await handleShopifyWebhook({
      topic: req.headers.get("x-shopify-topic") || "",
      shopDomain: req.headers.get("x-shopify-shop-domain") || "",
      payload: rawBody ? JSON.parse(rawBody) : {},
    });
  } catch (err) {
    console.error("[shopify webhook]", err);
  }

  return NextResponse.json({ ok: true });
}
