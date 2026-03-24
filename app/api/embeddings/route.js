import { NextResponse } from "next/server";
import pc from "../../lib/pinecone.js";
import { generateEmbeddingsInBatches } from "../../lib/embeddings.js";
import TrainingData from "@/app/models/TrainingData.js";
import { connectDB } from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

const MIN_CHUNK_WORDS = 500;
const MAX_TRAINING_CHUNKS = 10;

function buildChunkId(docid, index, embeddingVersion = 0) {
  return embeddingVersion > 0
    ? `${docid}_v${embeddingVersion}_${index}`
    : `${docid}_${index}`;
}

function buildChunkIds(docid, totalChunks, embeddingVersion = 0) {
  return Array.from({ length: totalChunks }, (_, index) =>
    buildChunkId(docid, index, embeddingVersion)
  );
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

function buildChunkLimitResponse(docid, totalChunks) {
  return NextResponse.json(
    {
      success: false,
      message: `Document exceeds maximum of ${MAX_TRAINING_CHUNKS} chunks after paragraph merging`,
      docid,
      totalChunks,
      maxChunks: MAX_TRAINING_CHUNKS,
      minChunkWords: MIN_CHUNK_WORDS,
    },
    { status: 400 }
  );
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
        code: error?.code || "embedding_failed",
        ...(error?.status ? { status: error.status } : {}),
        ...(error?.vertexStatus ? { vertexStatus: error.vertexStatus } : {}),
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

async function deleteDocumentVectors(brand, docid) {
  await Promise.all([
    pc.index("intelligent-kavisha").namespace(brand).deleteMany({ docid }),
    pc.index("kavisha-sparse").namespace(brand).deleteMany({ docid }),
  ]);
}

async function deleteDocumentVectorsByIds(brand, chunkIds) {
  if (!chunkIds.length) {
    return;
  }

  await Promise.all([
    pc.index("intelligent-kavisha").namespace(brand).deleteMany(chunkIds),
    pc.index("kavisha-sparse").namespace(brand).deleteMany(chunkIds),
  ]);
}

async function upsertEmbeddingBatches(brand, denseVectors, sparseRecords) {
  const batchSize = 40;
  const denseBatches = [];
  const sparseBatches = [];

  for (let i = 0; i < denseVectors.length; i += batchSize) {
    denseBatches.push(denseVectors.slice(i, i + batchSize));
    sparseBatches.push(sparseRecords.slice(i, i + batchSize));
  }

  const upsertPromises = [];

  for (let i = 0; i < denseBatches.length; i++) {
    upsertPromises.push(
      pc.index("intelligent-kavisha").namespace(brand).upsert(denseBatches[i])
    );
    upsertPromises.push(
      pc.index("kavisha-sparse").namespace(brand).upsertRecords(sparseBatches[i])
    );
  }

  await Promise.all(upsertPromises);
}

async function rollbackPostVectors(brand, docid) {
  try {
    await deleteDocumentVectors(brand, docid);
    return null;
  } catch (rollbackError) {
    return rollbackError;
  }
}

export async function POST(request) {
  try {
    const {
      text,
      brand,
      title,
      description,
      folderId,
      sourceUrl = "",
    } = await request.json();

    if (!text?.trim() || !brand || !title?.trim()) {
      return NextResponse.json(
        { error: "Text, brand, and title are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const shortUuid = uuidv4().substring(0, 8);
    const titleSlug = title
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 50);
    const docId = `${titleSlug}_${shortUuid}`;
    const embeddingVersion = 0;
    const chunks = buildChunks(text, docId, embeddingVersion);
    const totalChunks = chunks.length;

    if (totalChunks > MAX_TRAINING_CHUNKS) {
      return buildChunkLimitResponse(docId, totalChunks);
    }

    const createdAt = new Date();
    const titleValue = title.trim();
    const descriptionValue = description?.trim() || "";
    const createdAtISO = createdAt.toISOString();

    const embeddingResults = await generateEmbeddingsInBatches(
      chunks,
      "RETRIEVAL_DOCUMENT"
    );

    const { results, denseVectors, sparseRecords, failedChunks } =
      buildEmbeddingArtifacts(chunks, embeddingResults, {
        docid: docId,
        title: titleValue,
        description: descriptionValue,
        embeddingVersion,
        createdAtISO,
        sourceUrl,
      });

    if (failedChunks.length > 0) {
      console.warn("[embeddings][POST] Embedding generation failed", {
        docid: docId,
        failedChunks,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Embedding generation failed for one or more chunks",
          docid: docId,
          failedChunks,
        },
        { status: 500 }
      );
    }

    try {
      await upsertEmbeddingBatches(brand, denseVectors, sparseRecords);

      await TrainingData.create({
        docid: docId,
        title: titleValue,
        description: descriptionValue,
        brand,
        text,
        totalChunks,
        embeddingVersion,
        createdAt,
        ...(folderId && { folderId }),
        sourceUrl,
      });
    } catch (error) {
      const rollbackError = await rollbackPostVectors(brand, docId);

      return NextResponse.json(
        {
          success: false,
          message: "Training pipeline failed",
          docid: docId,
          error: error.message,
          ...(rollbackError
            ? { rollbackError: rollbackError.message || "Rollback failed" }
            : {}),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} chunks`,
      docid: docId,
      chunkIds: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Training pipeline failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const {
      docid,
      text,
      brand,
      title,
      folderId,
      sourceUrl = "",
    } = await request.json();

    await connectDB();

    const existingTrainingData = await TrainingData.findOne({ docid }).lean();

    if (!existingTrainingData) {
      return NextResponse.json(
        { success: false, message: "Training data not found", docid },
        { status: 404 }
      );
    }

    const previousBrand = existingTrainingData.brand || brand;
    const previousEmbeddingVersion = existingTrainingData.embeddingVersion ?? 0;
    const nextEmbeddingVersion = previousEmbeddingVersion + 1;
    const oldChunkIds = buildChunkIds(
      docid,
      existingTrainingData.totalChunks || 0,
      previousEmbeddingVersion
    );
    const chunks = buildChunks(text, docid, nextEmbeddingVersion);
    const totalChunks = chunks.length;

    if (totalChunks > MAX_TRAINING_CHUNKS) {
      return buildChunkLimitResponse(docid, totalChunks);
    }

    const createdAtISO = new Date().toISOString();
    const titleValue = title.trim();

    const embeddingResults = await generateEmbeddingsInBatches(
      chunks,
      "RETRIEVAL_DOCUMENT"
    );

    const { results, denseVectors, sparseRecords, failedChunks } =
      buildEmbeddingArtifacts(chunks, embeddingResults, {
        docid,
        title: titleValue,
        embeddingVersion: nextEmbeddingVersion,
        createdAtISO,
        sourceUrl,
      });

    if (failedChunks.length > 0) {
      console.warn("[embeddings][PATCH] Embedding generation failed", {
        docid,
        failedChunks,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Embedding generation failed for one or more chunks",
          docid,
          failedChunks,
        },
        { status: 500 }
      );
    }

    try {
      await upsertEmbeddingBatches(brand, denseVectors, sparseRecords);
      await deleteDocumentVectorsByIds(previousBrand, oldChunkIds);

      await TrainingData.updateOne(
        { docid },
        {
          $set: {
            text,
            title: titleValue.substring(0, 50),
            brand,
            totalChunks,
            embeddingVersion: nextEmbeddingVersion,
            updatedAt: new Date(),
            ...(folderId !== undefined && {
              folderId: folderId === "" || folderId == null ? null : folderId,
            }),
            ...(sourceUrl !== undefined && { sourceUrl: sourceUrl || "" }),
          },
        }
      );
    } catch (error) {
      const rollbackError = await (async () => {
        try {
          await deleteDocumentVectorsByIds(brand, results);
          return null;
        } catch (cleanupError) {
          return cleanupError;
        }
      })();

      return NextResponse.json(
        {
          success: false,
          message: "Training pipeline failed",
          docid,
          error: error.message,
          ...(rollbackError
            ? { rollbackError: rollbackError.message || "Rollback failed" }
            : {}),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully edited and processed ${results.length} chunks`,
      docid,
      chunkIds: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Training pipeline failed" },
      { status: 500 }
    );
  }
}
