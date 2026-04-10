/**
 * Persist scraped blog → TrainingData + Pinecone (same flow as /api/embeddings POST).
 * Loaded by blog-ingest-handlers via require; uses dynamic import for app ESM modules.
 */
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { v4: uuidv4 } = require("uuid");

const { connectDB } = require("../app/lib/db.js");
const BlogIngestUrl = require("../app/models/BlogIngestUrl.js");

const MIN_CHUNK_WORDS = 500;
const MAX_TRAINING_CHUNKS = 10;
const DENSE_INDEX = "intelligent-kavisha";
const SPARSE_INDEX = "kavisha-sparse";

/**
 * Next bundles this file under `.next/server/...`; `__dirname` is not `scripts/`.
 * Walk up to the directory that has package.json (repo root, e.g. /app in Docker).
 */
function resolveProjectRoot() {
  const fromEnv = process.env.PROJECT_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  let dir = __dirname;
  for (let i = 0; i < 40; i++) {
    try {
      if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    } catch {
      /* ignore */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "..");
}

const ROOT = resolveProjectRoot();

/** @type {Promise<{ generateEmbeddingsInBatches: Function, pc: import('@pinecone-database/pinecone').Pinecone | null, TrainingData: import('mongoose').Model }> | null} */
let depsPromise = null;

function loadDeps() {
  if (!depsPromise) {
    const fileUrl = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
    depsPromise = Promise.all([
      fileUrl("app/lib/embeddings.js"),
      fileUrl("app/lib/pinecone.js"),
      fileUrl("app/models/TrainingData.js"),
    ]).then(([emb, pineconeMod, td]) => ({
      generateEmbeddingsInBatches: emb.generateEmbeddingsInBatches,
      pc: pineconeMod.default,
      TrainingData: td.default,
    }));
  }
  return depsPromise;
}

function buildChunkId(docid, index, embeddingVersion = 0) {
  return embeddingVersion > 0 ? `${docid}_v${embeddingVersion}_${index}` : `${docid}_${index}`;
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildChunks(text, docid, embeddingVersion = 0) {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let currentParagraphs = [];
  let currentWordsCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWordsCount = countWords(paragraph);

    if (currentParagraphs.length === 0) {
      currentParagraphs = [paragraph];
      currentWordsCount = paragraphWordsCount;
      continue;
    }

    if (currentWordsCount < MIN_CHUNK_WORDS) {
      currentParagraphs.push(paragraph);
      currentWordsCount += paragraphWordsCount;
      continue;
    }

    const chunkIndex = chunks.length;
    chunks.push({
      chunk: currentParagraphs.join("\n\n"),
      chunkIndex,
      datapointId: buildChunkId(docid, chunkIndex, embeddingVersion),
      wordsCount: currentWordsCount,
    });

    currentParagraphs = [paragraph];
    currentWordsCount = paragraphWordsCount;
  }

  if (currentParagraphs.length > 0) {
    const chunkIndex = chunks.length;
    chunks.push({
      chunk: currentParagraphs.join("\n\n"),
      chunkIndex,
      datapointId: buildChunkId(docid, chunkIndex, embeddingVersion),
      wordsCount: currentWordsCount,
    });
  }

  return chunks;
}

function buildEmbeddingArtifacts(chunks, embeddingResults, metadata) {
  const results = [];
  const denseVectors = [];
  const sparseRecords = [];
  const failedChunks = [];

  const authorStr = (metadata.author || "").slice(0, 256);
  const publishedStr = (metadata.publishedDate || "").slice(0, 128);
  const publishedAtMs =
    metadata.publishedAtMs != null && Number.isFinite(Number(metadata.publishedAtMs))
      ? Math.trunc(Number(metadata.publishedAtMs))
      : metadata.publishedAt instanceof Date &&
          !Number.isNaN(metadata.publishedAt.getTime())
        ? metadata.publishedAt.getTime()
        : null;

  for (let i = 0; i < chunks.length; i++) {
    const { chunk, chunkIndex, datapointId } = chunks[i];
    const { embedding, error } = embeddingResults[i] || {};

    if (embedding === 0 || !Array.isArray(embedding)) {
      failedChunks.push({
        chunkId: datapointId,
        chunkIndex,
        reason: error?.message || "Embedding generation failed",
        code: error?.code || "embedding_failed",
      });
      continue;
    }

    denseVectors.push({
      id: datapointId,
      values: embedding,
      metadata: {
        text: chunk,
        docid: metadata.docid,
        title: metadata.title,
        ...(metadata.description !== undefined ? { description: metadata.description } : {}),
        embeddingVersion: metadata.embeddingVersion,
        createdAt: metadata.createdAtISO,
        chunkIndex: chunkIndex.toString(),
        chunkSourceUrl: metadata.sourceUrl,
        ...(authorStr ? { author: authorStr } : {}),
        ...(publishedStr ? { publishedDate: publishedStr } : {}),
        ...(publishedAtMs != null ? { publishedAtMs } : {}),
      },
    });

    sparseRecords.push({
      id: datapointId,
      text: chunk,
      docid: metadata.docid,
      embeddingVersion: metadata.embeddingVersion,
      chunkSourceUrl: metadata.sourceUrl,
      chunkIndex: chunkIndex.toString(),
      title: metadata.title,
      ...(publishedAtMs != null ? { publishedAtMs } : {}),
    });

    results.push(datapointId);
  }

  return { results, denseVectors, sparseRecords, failedChunks };
}

async function deleteDocumentVectors(pc, brand, docid) {
  await Promise.all([
    pc.index(DENSE_INDEX).namespace(brand).deleteMany({ docid }),
    pc.index(SPARSE_INDEX).namespace(brand).deleteMany({ docid }),
  ]);
}

async function deleteDocumentVectorsByIds(pc, brand, chunkIds) {
  if (!chunkIds.length) return;
  await Promise.all([
    pc.index(DENSE_INDEX).namespace(brand).deleteMany(chunkIds),
    pc.index(SPARSE_INDEX).namespace(brand).deleteMany(chunkIds),
  ]);
}

async function upsertEmbeddingBatches(pc, brand, denseVectors, sparseRecords) {
  const batchSize = 40;
  const upsertPromises = [];

  for (let i = 0; i < denseVectors.length; i += batchSize) {
    const d = denseVectors.slice(i, i + batchSize);
    const s = sparseRecords.slice(i, i + batchSize);
    upsertPromises.push(pc.index(DENSE_INDEX).namespace(brand).upsert(d));
    upsertPromises.push(pc.index(SPARSE_INDEX).namespace(brand).upsertRecords(s));
  }

  await Promise.all(upsertPromises);
}

function parsePublishedAt(raw) {
  if (!raw || typeof raw !== "string") return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  const d2 = new Date(Date.parse(raw));
  return Number.isNaN(d2.getTime()) ? null : d2;
}

/** Entrackr-style date strings: optional "IST" suffix → +0530. */
function parseEntrackrDateString(s) {
  if (!s || typeof s !== "string") return null;
  const normalized = s.trim().replace(/\s+IST\s*$/i, " +0530");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.getTime();
}

/** Unix ms for Pinecone metadata.publishedAtMs. */
function inferPublishedAtMs(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const fromEntrackr = parseEntrackrDateString(trimmed);
  if (fromEntrackr != null) return fromEntrackr;
  const d = parsePublishedAt(trimmed);
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
}

function slugFromTitle(title) {
  return (title || "blog")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 50);
}

/** Lines for title/author/date; empty string if none. */
function buildArticleHeaderBlock({ title, author, date }) {
  const lines = [];
  if (title?.trim()) lines.push(`Title: ${title.trim()}`);
  if (author?.trim()) lines.push(`Author: ${author.trim()}`);
  if (date != null && String(date).trim()) lines.push(`Published: ${String(date).trim()}`);
  return lines.length ? lines.join("\n") : "";
}

function buildEmbeddingTextBody(headerBlock, body) {
  if (!headerBlock) return body;
  return `${headerBlock}\n\n${body}`;
}

/** Prefix each chunk so mid-article chunks still carry author/date for retrieval. */
function prependHeaderToChunks(chunks, headerBlock) {
  if (!headerBlock) return chunks;
  return chunks.map((c) => ({
    ...c,
    chunk: `${headerBlock}\n\n${c.chunk}`,
  }));
}

/**
 * @param {{ url: string, title?: string, author?: string, text?: string, date?: string, imageUrl?: string }} scraped
 */
async function runBlogIngestTraining(scraped) {
  const url = scraped.url;
  const body = (scraped.text || "").trim();
  const titleFull = (scraped.title || "").trim() || "Untitled";
  const author = (scraped.author || "").slice(0, 256);
  const dateStr = (scraped.date || "").trim();

  if (!url) throw new Error("ingest: missing url");
  if (!body) throw new Error("ingest: empty text, nothing to embed");

  const headerBlock = buildArticleHeaderBlock({
    title: titleFull,
    author,
    date: dateStr,
  });
  const embeddingText = buildEmbeddingTextBody(headerBlock, body);

  const { generateEmbeddingsInBatches, pc, TrainingData } = await loadDeps();

  if (!pc) {
    throw new Error("Pinecone not configured (PINECONE_API_KEY)");
  }

  await connectDB();

  const row = await BlogIngestUrl.findOne({ url }).lean();
  const brand = (row?.brand || process.env.BLOG_INGEST_BRAND || "entrackr").trim();
  if (!brand) throw new Error("ingest: brand missing on BlogIngestUrl and BLOG_INGEST_BRAND");

  const shortUuid = uuidv4().slice(0, 8);
  const docid = `${slugFromTitle(titleFull)}_${shortUuid}`;
  const embeddingVersion = 0;
  let chunks = buildChunks(body, docid, embeddingVersion);
  chunks = prependHeaderToChunks(chunks, headerBlock);
  const totalChunks = chunks.length;

  if (totalChunks > MAX_TRAINING_CHUNKS) {
    throw new Error(`ingest: ${totalChunks} chunks exceeds max ${MAX_TRAINING_CHUNKS}`);
  }

  const createdAt = new Date();
  const titleStored = titleFull.slice(0, 512);
  const descriptionValue = embeddingText.slice(0, 200);
  const createdAtISO = createdAt.toISOString();
  const publishedAtMs = inferPublishedAtMs(dateStr);
  const publishedAt =
    publishedAtMs != null ? new Date(publishedAtMs) : parsePublishedAt(scraped.date);

  const embeddingResults = await generateEmbeddingsInBatches(chunks, "RETRIEVAL_DOCUMENT");

  const { results, denseVectors, sparseRecords, failedChunks } = buildEmbeddingArtifacts(
    chunks,
    embeddingResults,
    {
      docid,
      title: titleStored,
      description: descriptionValue,
      embeddingVersion,
      createdAtISO,
      sourceUrl: url,
      author,
      publishedDate: dateStr,
      publishedAt,
      publishedAtMs,
    }
  );

  if (failedChunks.length > 0) {
    const msg = failedChunks.map((f) => f.reason).join("; ");
    await BlogIngestUrl.updateOne({ url }, { $set: { lastError: `embed: ${msg}` } });
    throw new Error(`Embedding failed: ${msg}`);
  }

  try {
    await upsertEmbeddingBatches(pc, brand, denseVectors, sparseRecords);

    await TrainingData.create({
      docid,
      title: titleStored,
      description: descriptionValue,
      brand,
      text: embeddingText,
      totalChunks,
      embeddingVersion,
      createdAt,
      sourceUrl: url,
      ...(author ? { author } : {}),
      ...(publishedAt ? { publishedAt } : {}),
    });
  } catch (err) {
    try {
      await deleteDocumentVectors(pc, brand, docid);
    } catch (rollbackErr) {
      console.error("[blog-ingest-training] rollback failed", rollbackErr);
    }
    await BlogIngestUrl.updateOne({ url }, { $set: { lastError: err.message || String(err) } });
    throw err;
  }

  await BlogIngestUrl.updateOne(
    { url },
    {
      $set: {
        ingested: true,
        status: "scraped",
        lastError: "",
        title: titleFull.slice(0, 2000),
        text: body,
        author,
        publishedDate: dateStr,
      },
    }
  );

  ;
  return { docid, brand, chunkIds: results };
}

module.exports = { runBlogIngestTraining };
