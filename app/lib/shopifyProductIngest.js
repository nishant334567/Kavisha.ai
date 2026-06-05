import * as cheerio from "cheerio";
import { connectDB } from "@/app/lib/db";
import { generateEmbedding } from "@/app/lib/embeddings";
import pc from "@/app/lib/pinecone";
import TrainingData from "@/app/models/TrainingData";
import ShopifyMerchant from "@/app/models/ShopifyMerchant";
import {
  loadShopifySessionByBrand,
  loadShopifySessionByShop,
} from "@/app/lib/shopifyRepository";
import {
  fetchAllProducts,
  fetchProduct,
  fetchProductCount,
} from "@/app/lib/shopify/adminGraphql";
import { gidToNumericId } from "@/app/lib/shopify/gids";
import {
  enqueueCloudTask,
  isCloudTaskAlreadyQueued,
  tasksAuthHeaders,
} from "@/app/lib/cloudTasks";

const DENSE_INDEX = "intelligent-kavisha";
const SPARSE_INDEX = "kavisha-sparse";

function isPineconeNotFound(err) {
  const name = String(err?.name || "");
  const msg = String(err?.message || err);
  return name === "PineconeNotFoundError" || msg.includes("PineconeNotFoundError");
}

async function pineconeDeleteMany(indexName, namespace, filter) {
  if (!pc) return;
  try {
    await pc.index(indexName).namespace(namespace).deleteMany(filter);
  } catch (err) {
    if (isPineconeNotFound(err)) return;
    throw err;
  }
}

function trainUserMessage(err) {
  if (!err) return "Training failed";
  const msg = String(typeof err === "string" ? err : err?.message || err);
  const name = String(err?.name || "");
  const code = err?.code;

  if (code === 11000 || msg.includes("E11000")) {
    return "Duplicate training record";
  }
  if (name === "PineconeNotFoundError" || msg.includes("PineconeNotFoundError")) {
    return "Search index not ready — retry shortly";
  }
  if (msg.includes("Embedding generation failed")) {
    return "Could not generate embeddings";
  }
  return msg.length > 120 ? `${msg.slice(0, 117)}…` : msg;
}

function logTrainFailure({ shop, brand, productId, err }) {
  console.error(
    JSON.stringify({
      event: "shopify_train_failed",
      brand,
      shop,
      productId,
      message: trainUserMessage(err),
      detail: String(err?.message || err).slice(0, 400),
      name: err?.name,
      code: err?.code,
    })
  );
}

function trainFailureEntry(productId, productTitle, err) {
  return {
    productId: String(productId),
    title: productTitle || undefined,
    message: trainUserMessage(err),
  };
}

/** Stable TrainingData / Pinecone doc id per Shopify product. */
export function shopifyProductDocid(productId) {
  const id = String(productId || "").replace(/\D/g, "");
  return id ? `shopify-p-${id}` : "";
}

export function productIdFromShopifyDocid(docid) {
  const m = String(docid || "").match(/^shopify-p-(\d+)$/);
  return m ? m[1] : "";
}

export function isShopifyProductCard(item) {
  if (!item) return false;
  if (item.shopifyProductId) return true;
  return String(item.docid || "").startsWith("shopify-p-");
}

/** Metadata for Pinecone + source cards / cart. */
export function extractShopifyCommerceMeta(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const pick =
    variants.find((v) => {
      if (v?.inventory_management !== "shopify") return true;
      const qty = Number(v?.inventory_quantity);
      if (Number.isFinite(qty) && qty > 0) return true;
      return String(v?.inventory_policy || "") === "continue";
    }) || variants[0];
  const productId = parseShopifyProductId(product);
  return {
    sourceType: "shopify_product",
    shopifyProductId: productId,
    defaultVariantId: pick?.id != null ? String(pick.id) : "",
    imageUrl: String(product?.image?.src || "").trim(),
    price: pick?.price != null ? String(pick.price) : "",
  };
}

/** Pinecone vector id for the product's single chunk. */
function productVectorId(docid) {
  return `${docid}_0`;
}

/** @param {Record<string, unknown>} payload */
export function parseShopifyProductId(payload) {
  if (payload?.id != null) return gidToNumericId(payload.id);
  return gidToNumericId(payload?.admin_graphql_api_id);
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}

function variantAvailability(v) {
  if (v?.inventory_management !== "shopify") return "Inventory not tracked";
  const qty = Number(v?.inventory_quantity);
  if (!Number.isFinite(qty)) return "Stock unknown";
  if (qty > 0) return `In stock (${qty} available)`;
  if (String(v?.inventory_policy || "") === "continue") {
    return "Out of stock (continue selling)";
  }
  return "Out of stock (not available to purchase)";
}

function formatVariantLine(v) {
  const opts = [v?.option1, v?.option2, v?.option3]
    .map((o) => String(o || "").trim())
    .filter(Boolean);
  const label = opts.length > 0 ? opts.join(" · ") : String(v?.title || "Default").trim();
  const sale =
    v?.compare_at_price != null &&
    String(v.compare_at_price) !== "" &&
    String(v.compare_at_price) !== String(v?.price ?? "");
  const parts = [
    label,
    v?.price != null ? `$${v.price}` : "",
    sale ? `was $${v.compare_at_price}` : "",
    v?.sku ? `SKU ${v.sku}` : "",
    variantAvailability(v),
  ].filter(Boolean);
  return `- ${parts.join(" · ")}`;
}

/** @param {Record<string, unknown>} product */
export function formatShopifyProductText(product) {
  const lines = [];
  const title = String(product?.title || "").trim();
  if (title) lines.push(`Product: ${title}`);
  const vendor = String(product?.vendor || "").trim();
  if (vendor) lines.push(`Vendor: ${vendor}`);
  const type = String(product?.product_type || "").trim();
  if (type) lines.push(`Type: ${type}`);
  const tags = String(product?.tags || "").trim();
  if (tags) lines.push(`Tags: ${tags}`);
  const status = String(product?.status || "").trim();
  if (status) lines.push(`Status: ${status}`);

  const body = stripHtml(String(product?.body_html || ""));
  if (body) {
    lines.push("");
    lines.push(body);
  }

  const options = Array.isArray(product?.options) ? product.options : [];
  const optionSummary = options
    .map((o) => {
      const name = String(o?.name || "").trim();
      if (!name || name === "Title") return "";
      const values = Array.isArray(o?.values)
        ? o.values.map((x) => String(x || "").trim()).filter(Boolean)
        : [];
      return values.length ? `${name} (${values.join(", ")})` : "";
    })
    .filter(Boolean);
  if (optionSummary.length > 0) {
    lines.push("");
    lines.push(`Options: ${optionSummary.join("; ")}`);
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) {
    lines.push("");
    lines.push("Variants:");
    for (const v of variants) {
      lines.push(formatVariantLine(v));
    }
  }

  return lines.join("\n").trim();
}

function productSourceUrl(shopDomain, product) {
  const handle = String(product?.handle || "").trim();
  if (handle) return `https://${shopDomain}/products/${handle}`;
  const id = parseShopifyProductId(product);
  return id ? `https://${shopDomain}/admin/products/${id}` : "";
}

async function resolveBrandSubdomain(shopDomain) {
  await connectDB();
  const doc = await ShopifyMerchant.findOne({
    shopDomain: String(shopDomain || "").trim().toLowerCase(),
    uninstalledAt: null,
  }).lean();
  return String(doc?.brandSubdomain || "").trim().toLowerCase();
}

/**
 * Upsert product into TrainingData + Pinecone (create or update).
 * @param {{ shopDomain: string, payload: Record<string, unknown> }} args
 */
export async function syncShopifyProductCreateOrUpdate({ shopDomain, payload }) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  const productId = parseShopifyProductId(payload);
  if (!shop || !productId) {
    console.warn("[shopify product ingest] missing shop or product id");
    return;
  }

  const brand = await resolveBrandSubdomain(shop);
  if (!brand) {
    console.warn("[shopify product ingest] no brand linked for shop", shop);
    return;
  }

  let product = payload?.title != null ? payload : null;
  if (!product?.title && !product?.body_html) {
    const session = await loadShopifySessionByShop(shop);
    if (!session) return;
    product = await fetchProduct(session, productId);
  }
  if (!product) return;

  const text = formatShopifyProductText(product);
  if (!text) {
    console.warn("[shopify product ingest] empty product text", { shop, productId });
    return;
  }

  if (!pc) {
    throw new Error("Pinecone not configured (PINECONE_API_KEY)");
  }

  const docid = shopifyProductDocid(productId);
  const vectorId = productVectorId(docid);
  const title = String(product.title || "Shopify product").trim().slice(0, 512);
  const sourceUrl = productSourceUrl(shop, product);
  const descriptionValue = text.slice(0, 200);
  const commerce = extractShopifyCommerceMeta(product);
  const createdAt = new Date();
  const createdAtISO = createdAt.toISOString();

  const embedding = await generateEmbedding(text, "RETRIEVAL_DOCUMENT");
  if (embedding === 0 || !Array.isArray(embedding)) {
    throw new Error("Embedding generation failed");
  }

  await connectDB();
  await Promise.all([
    pineconeDeleteMany(DENSE_INDEX, brand, { docid }),
    pineconeDeleteMany(SPARSE_INDEX, brand, { docid }),
  ]);
  await TrainingData.deleteOne({ docid, brand });

  await Promise.all([
    pc.index(DENSE_INDEX).namespace(brand).upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          text,
          docid,
          title,
          description: descriptionValue,
          embeddingVersion: 0,
          createdAt: createdAtISO,
          chunkIndex: "0",
          chunkSourceUrl: sourceUrl,
          sourceType: commerce.sourceType,
          shopifyProductId: commerce.shopifyProductId,
          defaultVariantId: commerce.defaultVariantId,
          imageUrl: commerce.imageUrl,
          price: commerce.price,
        },
      },
    ]),
    pc.index(SPARSE_INDEX).namespace(brand).upsertRecords([
      {
        id: vectorId,
        text,
        docid,
        embeddingVersion: 0,
        chunkSourceUrl: sourceUrl,
        chunkIndex: "0",
        title,
        sourceType: commerce.sourceType,
        shopifyProductId: commerce.shopifyProductId,
        defaultVariantId: commerce.defaultVariantId,
        imageUrl: commerce.imageUrl,
        price: commerce.price,
      },
    ]),
  ]);

  await TrainingData.create({
    docid,
    title,
    description: descriptionValue,
    brand,
    text,
    totalChunks: 1,
    embeddingVersion: 0,
    createdAt,
    sourceUrl,
  });

  console.log(
    "[shopify product ingest] synced",
    JSON.stringify({ shop, brand, docid, productId })
  );
}

/** Product ids that have a TrainingData row (trained for chat). */
async function loadTrainedShopifyProductIds(brand) {
  await connectDB();
  const rows = await TrainingData.find({
    brand,
    docid: /^shopify-p-\d+$/,
  })
    .select("docid")
    .lean();
  return new Set(rows.map((r) => r.docid.replace(/^shopify-p-/, "")));
}

async function getUntrainedShopifyProducts(brandSubdomain) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const session = await loadShopifySessionByBrand(brand);
  if (!session?.accessToken) return null;

  const [raw, trainedIds] = await Promise.all([
    fetchAllProducts(session),
    loadTrainedShopifyProductIds(brand),
  ]);
  return {
    brand,
    shop: session.shop,
    untrained: raw.filter((p) => !trainedIds.has(String(p.id))),
  };
}

/** Live catalog for admin UI. */
export async function listShopifyProductsForBrand(brandSubdomain) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const session = await loadShopifySessionByBrand(brand);
  if (!session?.accessToken) return null;

  const shop = session.shop;
  const [raw, totalCount, trainedIds] = await Promise.all([
    fetchAllProducts(session),
    fetchProductCount(session),
    loadTrainedShopifyProductIds(brand),
  ]);

  const products = raw.map((p) => {
    const id = String(p.id);
    const v = p.variants?.[0];
    const handle = p.handle || "";
    return {
      id,
      title: p.title || "Untitled",
      status: p.status || "",
      vendor: p.vendor || "",
      productType: p.product_type || "",
      price: v?.price != null ? String(v.price) : "",
      imageUrl: p.image?.src || "",
      adminUrl: `https://${shop}/admin/products/${p.id}`,
      storefrontUrl: handle ? `https://${shop}/products/${handle}` : "",
      trained: trainedIds.has(id),
    };
  });

  const trainedCount = products.filter((p) => p.trained).length;

  return {
    shop,
    products,
    trainedCount,
    totalCount: totalCount || products.length,
  };
}

/** Train one product, or all products not yet in TrainingData (sync). */
export async function syncShopifyProductsForBrand(brandSubdomain, productId) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const id = String(productId || "").replace(/\D/g, "");

  if (id) {
    const session = await loadShopifySessionByBrand(brand);
    if (!session?.accessToken) return null;
    const shop = session.shop;
    try {
      await syncShopifyProductCreateOrUpdate({
        shopDomain: shop,
        payload: { id },
      });
      return { synced: 1, failed: 0, attempted: 1, errors: [] };
    } catch (err) {
      const entry = trainFailureEntry(id, undefined, err);
      logTrainFailure({ shop, brand, productId: id, err });
      return { synced: 0, failed: 1, attempted: 1, errors: [entry] };
    }
  }

  const ctx = await getUntrainedShopifyProducts(brand);
  if (!ctx) return null;

  const { shop, untrained } = ctx;
  let synced = 0;
  let failed = 0;
  const errors = [];

  for (const p of untrained) {
    try {
      await syncShopifyProductCreateOrUpdate({
        shopDomain: shop,
        payload: { id: p.id },
      });
      synced++;
    } catch (err) {
      failed++;
      const entry = trainFailureEntry(p.id, p.title, err);
      errors.push(entry);
      logTrainFailure({ shop, brand, productId: p.id, err });
    }
  }

  return { synced, failed, attempted: untrained.length, errors };
}

/** Enqueue Cloud Tasks — one task per untrained product. */
export async function queueShopifyTrainAll(brandSubdomain, baseUrl) {
  const ctx = await getUntrainedShopifyProducts(brandSubdomain);
  if (!ctx) return null;

  const { brand, untrained } = ctx;
  if (!untrained.length) return { async: true, queued: 0, skipped: 0 };

  const url = `${String(baseUrl).replace(/\/$/, "")}/api/tasks/train-shopify-product`;
  const headers = tasksAuthHeaders();
  let queued = 0;
  let skipped = 0;

  for (const p of untrained) {
    const productId = String(p.id);
    try {
      await enqueueCloudTask({
        url,
        payload: { brand, productId },
        taskNameSuffix: `shopify-train-${brand}-${productId}`,
        headers,
      });
      queued++;
    } catch (err) {
      if (isCloudTaskAlreadyQueued(err)) {
        skipped++;
        continue;
      }
      throw err;
    }
  }

  return { async: true, queued, skipped };
}

/**
 * @param {{ shopDomain: string, productId: string }} args
 */
export async function removeShopifyProductFromTraining({ shopDomain, productId }) {
  const shop = String(shopDomain || "").trim().toLowerCase();
  const id = String(productId || "").replace(/\D/g, "");
  if (!shop || !id) return;

  const brand = await resolveBrandSubdomain(shop);
  if (!brand) return;

  const docid = shopifyProductDocid(id);
  if (!pc) return;

  await connectDB();
  await Promise.all([
    pineconeDeleteMany(DENSE_INDEX, brand, { docid }),
    pineconeDeleteMany(SPARSE_INDEX, brand, { docid }),
  ]);
  await TrainingData.deleteOne({ docid, brand });
}
