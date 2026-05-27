import { v4 as uuidv4 } from "uuid";
import { connectDB } from "@/app/lib/db";
import {
  BULK_EMBEDDING_OPTIONS,
  generateEmbeddingsInBatches,
} from "@/app/lib/embeddings.js";
import pc from "@/app/lib/pinecone.js";
import TrainingData from "@/app/models/TrainingData.js";

const MIN_CHUNK_WORDS = 500;
export const MAX_TRAINING_CHUNKS = 20;

function buildChunkId(docid, index, embeddingVersion = 0) {
  return embeddingVersion > 0
    ? `${docid}_v${embeddingVersion}_${index}`
    : `${docid}_${index}`;
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

  for (let i = 0; i < chunks.length; i++) {
    const { chunk, chunkIndex, datapointId } = chunks[i];
    const { embedding, error } = embeddingResults[i] || {};

    if (embedding === 0 || !Array.isArray(embedding)) {
      failedChunks.push({
        chunkId: datapointId,
        chunkIndex,
        reason: error?.message || "Embedding generation failed",
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
        ...(metadata.description !== undefined
          ? { description: metadata.description }
          : {}),
        embeddingVersion: metadata.embeddingVersion,
        createdAt: metadata.createdAtISO,
        chunkIndex: chunkIndex.toString(),
        chunkSourceUrl: metadata.sourceUrl,
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
    });

    results.push(datapointId);
  }

  return { results, denseVectors, sparseRecords, failedChunks };
}

async function upsertEmbeddingBatches(brand, denseVectors, sparseRecords) {
  const batchSize = 40;
  for (let i = 0; i < denseVectors.length; i += batchSize) {
    const denseBatch = denseVectors.slice(i, i + batchSize);
    const sparseBatch = sparseRecords.slice(i, i + batchSize);
    await Promise.all([
      pc.index("intelligent-kavisha").namespace(brand).upsert(denseBatch),
      pc.index("kavisha-sparse").namespace(brand).upsertRecords(sparseBatch),
    ]);
  }
}

async function deleteDocumentVectors(brand, docid) {
  await Promise.all([
    pc.index("intelligent-kavisha").namespace(brand).deleteMany({ docid }),
    pc.index("kavisha-sparse").namespace(brand).deleteMany({ docid }),
  ]);
}

/**
 * Train brand knowledge base from plain text (same pipeline as POST /api/embeddings).
 */
export async function trainDocument({
  brand,
  title,
  text,
  description,
  sourceUrl = "",
  folderId,
  /** @type {'default' | 'bulk'} */
  embeddingProfile = "default",
}) {
  const trimmedText = (text || "").trim();
  const titleValue = (title || "").trim();
  if (!trimmedText || !brand || !titleValue) {
    throw new Error("Text, brand, and title are required");
  }

  await connectDB();

  const shortUuid = uuidv4().substring(0, 8);
  const titleSlug = titleValue.replace(/[^a-zA-Z0-9]/g, "").substring(0, 50);
  const docId = `${titleSlug}_${shortUuid}`;
  const embeddingVersion = 0;
  const chunks = buildChunks(trimmedText, docId, embeddingVersion);

  if (chunks.length > MAX_TRAINING_CHUNKS) {
    throw new Error(
      `Document exceeds maximum of ${MAX_TRAINING_CHUNKS} chunks after paragraph merging`
    );
  }

  const createdAt = new Date();
  const descriptionValue = (description ?? titleValue).trim();
  const createdAtISO = createdAt.toISOString();

  const embeddingOptions =
    embeddingProfile === "bulk" ? BULK_EMBEDDING_OPTIONS : undefined;

  const embeddingResults = await generateEmbeddingsInBatches(
    chunks,
    "RETRIEVAL_DOCUMENT",
    embeddingOptions
  );

  const { results, denseVectors, sparseRecords, failedChunks } =
    buildEmbeddingArtifacts(chunks, embeddingResults, {
      docid: docId,
      title: titleValue,
      description: descriptionValue,
      embeddingVersion,
      createdAtISO,
      sourceUrl: sourceUrl || "",
    });

  if (failedChunks.length > 0) {
    const detail = failedChunks
      .slice(0, 3)
      .map((c) => `chunk ${c.chunkIndex}: ${c.reason}`)
      .join("; ");
    throw new Error(
      `Embedding generation failed (${failedChunks.length} chunk${failedChunks.length === 1 ? "" : "s"}). ${detail}`
    );
  }

  try {
    await upsertEmbeddingBatches(brand, denseVectors, sparseRecords);
    await TrainingData.create({
      docid: docId,
      title: titleValue.substring(0, 50),
      description: descriptionValue,
      brand,
      text: trimmedText,
      totalChunks: chunks.length,
      embeddingVersion,
      createdAt,
      ...(folderId && { folderId }),
      sourceUrl: sourceUrl || "",
    });
  } catch (error) {
    try {
      await deleteDocumentVectors(brand, docId);
    } catch {
      // ignore rollback errors
    }
    throw error;
  }

  return {
    success: true,
    message: `Successfully processed ${results.length} chunks`,
    docid: docId,
    chunkIds: results,
  };
}
