import { connectDB } from "@/app/lib/db";
import pc from "@/app/lib/pinecone";
import TrainingData from "@/app/models/TrainingData";
import ShopifyMerchant from "@/app/models/ShopifyMerchant";
import { shopifyProductDocid } from "@/app/lib/shopifyProductIngest";

const DENSE_INDEX = "intelligent-kavisha";
const SPARSE_INDEX = "kavisha-sparse";
const SHOPIFY_PRODUCT_DOCID = /^shopify-p-/;

async function resolveBrandForShop(shopDomain) {
  await connectDB();
  const shop = String(shopDomain || "").trim().toLowerCase();
  if (!shop) return "";
  const doc = await ShopifyMerchant.findOne({ shopDomain: shop }).lean();
  return String(doc?.brandSubdomain || "").trim().toLowerCase();
}

async function deleteVectorsForDocids(brand, docids) {
  const unique = [...new Set(docids.filter(Boolean))];
  if (!unique.length || !pc) return;

  const filter =
    unique.length === 1
      ? { docid: { $eq: unique[0] } }
      : { docid: { $in: unique } };

  await Promise.all([
    pc.index(DENSE_INDEX).namespace(brand).deleteMany(filter),
    pc.index(SPARSE_INDEX).namespace(brand).deleteMany(filter),
  ]);
}

/** Remove all Shopify product training rows for a Kavisha brand. */
async function purgeShopifyProductTraining(brand) {
  if (!brand) return 0;
  await connectDB();
  const docs = await TrainingData.find({ brand, docid: SHOPIFY_PRODUCT_DOCID })
    .select("docid")
    .lean();
  const docids = docs.map((d) => d.docid).filter(Boolean);
  if (docids.length) {
    await deleteVectorsForDocids(brand, docids);
    await TrainingData.deleteMany({ brand, docid: SHOPIFY_PRODUCT_DOCID });
  }
  return docids.length;
}

/**
 * shop/redact — erase app-held data for a store (sent ~48h after uninstall).
 * @param {{ shop_domain?: string, shopDomain?: string }} payload
 */
export async function handleShopRedact(payload) {
  const shop = String(payload?.shop_domain || payload?.shopDomain || "")
    .trim()
    .toLowerCase();
  if (!shop) return;

  const brand = await resolveBrandForShop(shop);
  const removedProducts = await purgeShopifyProductTraining(brand);

  await connectDB();
  await ShopifyMerchant.deleteOne({ shopDomain: shop });

  console.info("[shopify gdpr] shop/redact", {
    shop,
    brand: brand || null,
    removedProducts,
  });
}

/**
 * customers/redact — delete customer-linked data we may hold.
 * Kavisha does not store Shopify customer PII with current scopes; log for audit.
 */
export async function handleCustomerRedact(payload) {
  const shop = String(payload?.shop_domain || "").trim().toLowerCase();
  const customerId = payload?.customer?.id;
  console.info("[shopify gdpr] customers/redact", {
    shop,
    customerId: customerId ?? null,
    ordersToRedact: payload?.orders_to_redact?.length ?? 0,
  });
}

/**
 * customers/data_request — export customer data to the merchant.
 * Kavisha does not store Shopify customer PII with current scopes; log for audit.
 */
export async function handleCustomerDataRequest(payload) {
  const shop = String(payload?.shop_domain || "").trim().toLowerCase();
  const customerId = payload?.customer?.id;
  console.info("[shopify gdpr] customers/data_request", {
    shop,
    customerId: customerId ?? null,
    dataRequestId: payload?.data_request?.id ?? null,
    ordersRequested: payload?.orders_requested?.length ?? 0,
  });
}

/** customers/redact for a single product id when tied to orders (future use). */
export async function redactShopifyProductIds(shopDomain, productIds) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  const brand = await resolveBrandForShop(shop);
  if (!brand) return;

  const docids = (productIds || [])
    .map((id) => shopifyProductDocid(id))
    .filter(Boolean);
  if (!docids.length) return;

  await connectDB();
  await deleteVectorsForDocids(brand, docids);
  await TrainingData.deleteMany({ brand, docid: { $in: docids } });
}
