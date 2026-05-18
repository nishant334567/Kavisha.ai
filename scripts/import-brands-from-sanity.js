/**
 * Import all published Sanity `brand` documents → Mongo `brands`.
 * Uses .env.local when present; process.env overrides (for staging dataset/URI).
 *
 *   node scripts/import-brands-from-sanity.js
 *   node scripts/import-brands-from-sanity.js nishantmittal
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { createClient } = require("next-sanity");
const Brand = require("../app/models/Brand");

function loadLocalConfig() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf8");
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function cfg(key, fileCfg) {
  const v = process.env[key] ?? fileCfg[key];
  return typeof v === "string" ? v.trim() : "";
}

function normalizeService(s) {
  return {
    ...s,
    _key: String(s._key).trim(),
    name: String(s.name || "").trim() || "service",
    title: String(s.title || s.name || "Service").trim() || "Service",
    about: typeof s.about === "string" ? s.about : "",
    initialMessage: typeof s.initialMessage === "string" ? s.initialMessage : "",
    behaviour: typeof s.behaviour === "string" ? s.behaviour : "",
    rules: typeof s.rules === "string" ? s.rules : "",
    introquestions: Array.isArray(s.introquestions) ? s.introquestions : [],
  };
}

function toMongoBrand(sanityDoc) {
  const {
    _id,
    _rev,
    _type,
    _createdAt,
    _updatedAt,
    ...fields
  } = sanityDoc;

  const services = fields.services;
  if (services !== undefined && !Array.isArray(services)) {
    throw new TypeError("brand.services must be an array when present");
  }

  const mappedServices = (services || []).map((s, i) => {
    if (!s?._key || typeof s._key !== "string") {
      throw new TypeError(`services[${i}]._key must be a non-empty string`);
    }
    return normalizeService(s);
  });

  const subdomain = String(fields.subdomain || "")
    .trim()
    .toLowerCase();
  if (!subdomain) throw new TypeError("brand missing subdomain");

  return {
    ...fields,
    subdomain,
    sanityId: typeof _id === "string" ? _id : "",
    widgetLauncher: fields.widgetLauncher ?? {},
    supportChannels: fields.supportChannels ?? {},
    services: mappedServices,
    admins: Array.isArray(fields.admins) ? fields.admins : [],
  };
}

async function main() {
  const fileCfg = loadLocalConfig();
  const mongoUri = cfg("MONGODB_URI", fileCfg);
  const sanityToken = cfg("SANITY_API_TOKEN", fileCfg);
  const projectId = cfg("NEXT_PUBLIC_SANITY_PROJECT_ID", fileCfg) || "wkgir1xd";
  const dataset = cfg("NEXT_PUBLIC_SANITY_DATASET", fileCfg) || "development";
  const onlySub = process.argv[2]?.trim().toLowerCase();

  if (!mongoUri) throw new Error("MONGODB_URI is required");
  if (!sanityToken) throw new Error("SANITY_API_TOKEN is required");

  const sanity = createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
    token: sanityToken,
  });

  const filter = onlySub
    ? `_type == "brand" && subdomain == $sub && !(_id in path("drafts.**"))`
    : `_type == "brand" && subdomain != "kavisha" && !(_id in path("drafts.**"))`;
  const params = onlySub ? { sub: onlySub } : {};
  const query = onlySub
    ? `*[${filter}]`
    : `*[${filter}] | order(subdomain asc)`;

  const docs = await sanity.fetch(query, params);
  if (!Array.isArray(docs) || docs.length === 0) {

    return;
  }

  await mongoose.connect(mongoUri);

  const results = [];
  const failed = [];
  for (const doc of docs) {
    try {
      const payload = toMongoBrand(doc);
      const result = await Brand.findOneAndUpdate(
        { subdomain: payload.subdomain },
        { $set: payload },
        { upsert: true, new: true, runValidators: true }
      );
      results.push({
        subdomain: result.subdomain,
        mongoId: String(result._id),
        serviceCount: (result.services || []).length,
      });
    } catch (e) {
      failed.push({
        subdomain: doc?.subdomain,
        error: e?.message || String(e),
      });
    }
  }

  await mongoose.disconnect();

  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        dataset,
        imported: results.length,
        failed: failed.length,
        brands: results,
        errors: failed,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
