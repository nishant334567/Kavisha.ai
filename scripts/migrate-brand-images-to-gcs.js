/**
 * Migrate brand logo, hero, and widget-launcher images: Sanity CDN → public GCS URLs on Brand.
 *
 *   brands/{subdomain}/logo.{ext}
 *   brands/{subdomain}/brand-image.{ext}
 *   brands/{subdomain}/widget-launcher.{ext}
 *
 *   node scripts/migrate-brand-images-to-gcs.js [--dry-run] [--force] [subdomain]
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Storage } = require("@google-cloud/storage");
const imageUrlBuilder = require("@sanity/image-url");
const { createClient } = require("next-sanity");
const Brand = require("../app/models/Brand");

const IMAGE_TARGETS = [
  { slug: "logo", urlField: "logoUrl", legacyField: "logo" },
  { slug: "brand-image", urlField: "brandImageUrl", legacyField: "brandImage" },
  {
    slug: "widget-launcher",
    urlField: "widgetLauncher.buttonImageUrl",
    legacyField: "widgetLauncher.buttonImage",
  },
];

const LEGACY_IMAGE_UNSET = [
  "logo",
  "brandImage",
  "paymentQr",
  "widgetLauncher.buttonImage",
];

function loadLocalConfig() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = val;
  }
  return out;
}

function cfg(key, fileCfg) {
  const v = process.env[key] ?? fileCfg[key];
  return typeof v === "string" ? v.trim() : "";
}

function getNested(obj, pathKey) {
  return pathKey.split(".").reduce((o, k) => o?.[k], obj);
}

function isPublicGcsUrl(url) {
  return (
    typeof url === "string" &&
    url.startsWith("https://storage.googleapis.com/") &&
    !url.includes("X-Goog-Signature")
  );
}

function safeSubdomain(sub) {
  return (
    String(sub || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}

function extFrom(contentType, sourceUrl) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  try {
    const m = new URL(sourceUrl).pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (m) return m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return "jpg";
}

function sanityBuilder(fileCfg) {
  const projectId =
    cfg("NEXT_PUBLIC_SANITY_PROJECT_ID", fileCfg) || "wkgir1xd";
  const dataset = cfg("NEXT_PUBLIC_SANITY_DATASET", fileCfg) || "development";
  return imageUrlBuilder(
    createClient({
      projectId,
      dataset,
      apiVersion: "2025-01-01",
      useCdn: true,
    })
  );
}

function sanitySourceUrl(builder, image) {
  if (!image?.asset?._ref) return null;
  try {
    return builder.image(image).url() || null;
  } catch {
    return null;
  }
}

function getBucket(fileCfg) {
  const name = cfg("GCS_BUCKET_NAME", fileCfg) || cfg("GCS_KNOWLEDGE_BASE", fileCfg);
  if (!name) return null;
  const email = cfg("GCP_CLIENT_EMAIL", fileCfg);
  const key = cfg("GCP_PRIVATE_KEY", fileCfg);
  const storage = new Storage(
    email && key
      ? {
          credentials: {
            client_email: email,
            private_key: key.replace(/\\n/g, "\n"),
          },
        }
      : {}
  );
  return storage.bucket(name);
}

async function uploadToGcs(bucket, objectPath, buffer, contentType) {
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  try {
    await file.makePublic();
  } catch {
    /* read path uses signed URLs via refreshImageUrl */
  }
  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}

async function main() {
  const fileCfg = loadLocalConfig();
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const onlySub = argv.find((a) => !a.startsWith("-"))?.trim().toLowerCase();

  const mongoUri = cfg("MONGODB_URI", fileCfg);
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  const bucket = dryRun ? null : getBucket(fileCfg);
  if (!dryRun && !bucket) {
    throw new Error("GCS_BUCKET_NAME or GCS_KNOWLEDGE_BASE is required");
  }

  const builder = sanityBuilder(fileCfg);
  const sanityToken = cfg("SANITY_API_TOKEN", fileCfg);
  const projectId =
    cfg("NEXT_PUBLIC_SANITY_PROJECT_ID", fileCfg) || "wkgir1xd";
  const dataset = cfg("NEXT_PUBLIC_SANITY_DATASET", fileCfg) || "development";
  const sanityFetch = sanityToken
    ? createClient({
        projectId,
        dataset,
        apiVersion: "2025-01-01",
        useCdn: false,
        token: sanityToken,
      })
    : null;

  await mongoose.connect(mongoUri);

  const brands = await Brand.find(
    onlySub ? { subdomain: onlySub } : {}
  ).lean();

  const summary = {
    ok: true,
    dryRun,
    bucket: bucket?.name || null,
    brandsProcessed: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    brands: [],
  };

  for (const brand of brands) {
    const subdomain = safeSubdomain(brand.subdomain);
    const report = { subdomain, uploaded: [], skipped: [], failed: [] };
    const $set = {};
    let sanityImages = null;

    for (const target of IMAGE_TARGETS) {
      const currentUrl = getNested(brand, target.urlField);
      if (isPublicGcsUrl(currentUrl) && !force) {
        report.skipped.push({ field: target.urlField, url: currentUrl });
        summary.skipped++;
        continue;
      }

      let image = getNested(brand, target.legacyField);
      if (!image?.asset?._ref && sanityFetch) {
        if (!sanityImages) {
          sanityImages = await sanityFetch.fetch(
            `*[_type == "brand" && subdomain == $sub][0]{
              logo,
              brandImage,
              widgetLauncher { buttonImage }
            }`,
            { sub: brand.subdomain }
          );
        }
        image = getNested(sanityImages, target.legacyField);
      }
      const sourceUrl = sanitySourceUrl(builder, image);
      if (!sourceUrl) continue;

      const objectBase = `brands/${subdomain}/${target.slug}`;

      try {
        if (dryRun) {
          report.uploaded.push({
            field: target.urlField,
            wouldWrite: `https://storage.googleapis.com/${bucket?.name || "BUCKET"}/${objectBase}.jpg`,
          });
          summary.uploaded++;
          continue;
        }

        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await res.arrayBuffer());
        const objectPath = `${objectBase}.${extFrom(contentType, sourceUrl)}`;
        const url = await uploadToGcs(bucket, objectPath, buffer, contentType);

        $set[target.urlField] = url;
        report.uploaded.push({ field: target.urlField, url });
        summary.uploaded++;
      } catch (e) {
        report.failed.push({
          field: target.urlField,
          error: e?.message || String(e),
        });
        summary.failed++;
      }
    }

    if (!dryRun) {
      const update = {};
      if (Object.keys($set).length > 0) update.$set = $set;
      const hasLegacy = LEGACY_IMAGE_UNSET.some((f) => {
        const v = getNested(brand, f);
        return v && typeof v === "object";
      });
      if (hasLegacy || Object.keys($set).length > 0) {
        update.$unset = Object.fromEntries(
          LEGACY_IMAGE_UNSET.map((f) => [f, ""])
        );
      }
      if (Object.keys(update).length > 0) {
        await Brand.updateOne({ subdomain: brand.subdomain }, update);
      }
    }

    summary.brandsProcessed++;
    summary.brands.push(report);
  }

  summary.ok = summary.failed === 0;
  await mongoose.disconnect();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
