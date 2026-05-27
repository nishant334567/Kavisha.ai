import crypto from "crypto";
import {
  parseShopifyProductId,
  syncShopifyProductCreateOrUpdate,
  removeShopifyProductFromTraining,
} from "@/app/lib/shopifyProductIngest";
import { markShopifyUninstalled } from "@/app/lib/shopifyRepository";
import {
  handleCustomerDataRequest,
  handleCustomerRedact,
  handleShopRedact,
} from "@/app/lib/shopify/gdprCompliance";

export function verifyShopifyWebhookHmac(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret || !rawBody || !hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest);
  const b = Buffer.from(String(hmacHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function handleShopifyWebhook({ topic, shopDomain, payload }) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  const t = String(topic || "").trim().toLowerCase();
  if (!shop || !t) return;

  const data = payload ?? {};

  switch (t) {
    case "products/create":
    case "products/update":
      await syncShopifyProductCreateOrUpdate({ shopDomain: shop, payload: data });
      break;
    case "products/delete": {
      const productId = parseShopifyProductId(data);
      if (productId) {
        await removeShopifyProductFromTraining({ shopDomain: shop, productId });
      }
      break;
    }
    case "app/uninstalled":
      await markShopifyUninstalled(shop);
      break;
    case "customers/data_request":
      await handleCustomerDataRequest(data);
      break;
    case "customers/redact":
      await handleCustomerRedact(data);
      break;
    case "shop/redact":
      await handleShopRedact(data);
      break;
  }
}
