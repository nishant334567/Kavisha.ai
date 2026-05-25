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
import { SHOPIFY_ADMIN_API_VERSION } from "@/app/lib/shopify";

const DENSE_INDEX = "intelligent-kavisha";
const SPARSE_INDEX = "kavisha-sparse";

/** Stable TrainingData / Pinecone doc id per Shopify product. */
export function shopifyProductDocid(productId) {
  const id = String(productId || "").replace(/\D/g, "");
  return id ? `shopify-p-${id}` : "";
}

/** Pinecone vector id for the product's single chunk. */
function productVectorId(docid) {
  return `${docid}_0`;
}

/** @param {Record<string, unknown>} payload */
export function parseShopifyProductId(payload) {
  if (payload?.id != null) return String(payload.id);
  const gid = String(payload?.admin_graphql_api_id || "");
  const m = gid.match(/\/Product\/(\d+)/i);
  return m ? m[1] : "";
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

async function fetchShopifyProduct(shopDomain, productId) {
  const session = await loadShopifySessionByShop(shopDomain);
  if (!session?.accessToken) return null;

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/products/${productId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": session.accessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Shopify product fetch failed (${res.status})`);
  }

  const data = await res.json();
  return data?.product || null;
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
    product = await fetchShopifyProduct(shop, productId);
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
  const createdAt = new Date();
  const createdAtISO = createdAt.toISOString();

  const embedding = await generateEmbedding(text, "RETRIEVAL_DOCUMENT");
  if (embedding === 0 || !Array.isArray(embedding)) {
    throw new Error("Embedding generation failed");
  }

  await connectDB();
  await Promise.all([
    pc.index(DENSE_INDEX).namespace(brand).deleteMany({ docid }),
    pc.index(SPARSE_INDEX).namespace(brand).deleteMany({ docid }),
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

function shopifyAdminHeaders(accessToken) {
  return { "X-Shopify-Access-Token": accessToken };
}

function shopifyNextPageUrl(linkHeader) {
  if (!linkHeader) return null;
  const part = linkHeader.split(",").find((p) => p.includes('rel="next"'));
  const m = part?.match(/<([^>]+)>/);
  return m ? m[1] : null;
}

/** All products in the store (paginated). */
async function fetchAllShopifyProducts(shop, accessToken) {
  const headers = shopifyAdminHeaders(accessToken);
  const fields =
    "id,title,status,vendor,product_type,handle,image,options,variants";
  let url = `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/products.json?limit=250&fields=${fields}`;
  const all = [];

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Shopify products list failed (${res.status})`);
    const data = await res.json();
    all.push(...(data.products || []));
    url = shopifyNextPageUrl(res.headers.get("link"));
  }

  return all;
}

async function fetchShopifyProductCount(shop, accessToken) {
  const res = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/products/count.json`,
    { headers: shopifyAdminHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`Shopify product count failed (${res.status})`);
  const data = await res.json();
  return Number(data.count) || 0;
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

/** Live catalog for admin UI. */
export async function listShopifyProductsForBrand(brandSubdomain) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const session = await loadShopifySessionByBrand(brand);
  if (!session?.accessToken) return null;

  const shop = session.shop;
  const token = session.accessToken;
  const [raw, totalCount, trainedIds] = await Promise.all([
    fetchAllShopifyProducts(shop, token),
    fetchShopifyProductCount(shop, token),
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

/** Train all store products that are not yet in TrainingData. */
export async function syncUntrainedShopifyProductsForBrand(brandSubdomain) {
  const brand = String(brandSubdomain || "").trim().toLowerCase();
  const session = await loadShopifySessionByBrand(brand);
  if (!session?.accessToken) return null;

  const shop = session.shop;
  const [raw, trainedIds] = await Promise.all([
    fetchAllShopifyProducts(shop, session.accessToken),
    loadTrainedShopifyProductIds(brand),
  ]);

  const untrained = raw.filter((p) => !trainedIds.has(String(p.id)));
  let synced = 0;
  let failed = 0;

  for (const p of untrained) {
    try {
      await syncShopifyProductCreateOrUpdate({
        shopDomain: shop,
        payload: { id: p.id },
      });
      synced++;
    } catch (err) {
      failed++;
      console.error("[shopify product sync]", { shop, productId: p.id, err });
    }
  }

  return { synced, failed, attempted: untrained.length };
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
    pc.index(DENSE_INDEX).namespace(brand).deleteMany({ docid }),
    pc.index(SPARSE_INDEX).namespace(brand).deleteMany({ docid }),
  ]);
  await TrainingData.deleteOne({ docid, brand });
}
