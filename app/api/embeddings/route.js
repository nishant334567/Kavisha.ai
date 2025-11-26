import { NextResponse } from "next/server";
import pc from "../../lib/pinecone.js";
import { generateEmbedding } from "../../lib/embeddings.js";
import TrainingData from "@/app/models/TrainingData.js";
import { connectDB } from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const {
      text,
      brand,
      title,
      description,
      // chunkSize = 200,
    } = await request.json();

    // Minimal server-side validation (security check)
    if (!text?.trim() || !brand || !title?.trim()) {
      return NextResponse.json(
        { error: "Text, brand, and title are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const shortUuid = uuidv4().substring(0, 8); // First 8 chars for uniqueness
    const titleSlug = title.trim().replace(/[^a-zA-Z0-9]/g, ""); // Remove special chars
    const docId = `${titleSlug}_${shortUuid}`;

    let paragraphs = text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const chunks = paragraphs.map((item, index) => {
      return {
        chunk: item,
        chunkIndex: index,
        datapointId: `${docId}_${index}`,
        wordsCount: item.split(" ").length,
      };
    });
    const totalChunks = chunks.length;

    const createdAt = new Date();
    const titleValue = title.trim();
    const descriptionValue = description?.trim() || "";

    await TrainingData.create({
      docid: docId,
      title: titleValue,
      description: descriptionValue,
      brand,
      text: text,
      totalChunks: totalChunks,
      createdAt,
    });

    const results = [];
    const createdAtISO = createdAt.toISOString();

    const embeddingPromises = chunks.map(({ chunk }) =>
      generateEmbedding(chunk, "RETRIEVAL_DOCUMENT")
    );
    const embeddings = await Promise.all(embeddingPromises);

    const denseVectors = [];
    const sparseRecords = [];

    for (let i = 0; i < chunks.length; i++) {
      const { chunk, chunkIndex, datapointId } = chunks[i];
      const embedding = embeddings[i];

      if (embedding === 0 || !Array.isArray(embedding)) {
        continue;
      }

      denseVectors.push({
        id: datapointId,
        values: embedding,
        metadata: {
          text: chunk,
          docid: docId,
          title: titleValue,
          description: descriptionValue,
          createdAt: createdAtISO,
          chunkIndex: chunkIndex.toString(),
        },
      });

      // sparseRecords.push({
      //   id: datapointId,
      //   text: chunk,
      // });

      results.push(datapointId);
    }

    const batchSize = 50;
    const denseBatches = [];
    const sparseBatches = [];

    for (let i = 0; i < denseVectors.length; i += batchSize) {
      denseBatches.push(denseVectors.slice(i, i + batchSize));
      // sparseBatches.push(sparseRecords.slice(i, i + batchSize));
    }

    // Parallelize batch upserts to both indexes
    const upsertPromises = [];
    for (let i = 0; i < denseBatches.length; i++) {
      upsertPromises.push(
        pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .upsert(denseBatches[i])
          .catch((err) => console.error(`Dense batch ${i} error:`, err))
      );
      // Sparse index upsert commented out - not using sparse for responses
      // upsertPromises.push(
      //   pc
      //     .index("kavisha-sparse")
      //     .namespace(brand)
      //     .upsertRecords(sparseBatches[i])
      //     .catch((err) => console.error(`Sparse batch ${i} error:`, err))
      // );
    }

    // Wait for all upserts to complete
    await Promise.all(upsertPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} chunks`,
      docid: docId,
      chunkIds: results,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { docid, text, brand, title } = await request.json();
    await connectDB();
    // const sparseIndexNamespace = pc.index("kavisha-sparse").namespace(brand);
    const denseIndexNamespace = pc
      .index("intelligent-kavisha")
      .namespace(brand);

    await Promise.all([
      denseIndexNamespace.deleteMany({ docid: docid }),
      // Sparse index deletion commented out - not using sparse for responses
      // sparseIndexNamespace.deleteMany({ docid: docid }),
    ]);

    // const shortUuid = uuidv4().substring(0, 8); // First 8 chars for uniqueness
    // const titleSlug = title.trim().replace(/[^a-zA-Z0-9]/g, ""); // Remove special chars
    // const docId = `${titleSlug}_${shortUuid}`;

    let paragraphs = text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const chunks = paragraphs.map((item, index) => {
      return {
        chunk: item,
        chunkIndex: index,
        datapointId: `${docid}_${index}`,
        wordsCount: item.split(" ").length,
      };
    });
    const totalChunks = chunks.length;

    const createdAt = new Date();
    const titleValue = title.trim();
    const results = [];
    const createdAtISO = createdAt.toISOString();

    const embeddingPromises = chunks.map(({ chunk }) =>
      generateEmbedding(chunk, "RETRIEVAL_DOCUMENT")
    );
    const embeddings = await Promise.all(embeddingPromises);

    const denseVectors = [];
    const sparseRecords = [];

    for (let i = 0; i < chunks.length; i++) {
      const { chunk, chunkIndex, datapointId } = chunks[i];
      const embedding = embeddings[i];

      if (embedding === 0 || !Array.isArray(embedding)) {
        continue;
      }

      denseVectors.push({
        id: datapointId,
        values: embedding,
        metadata: {
          text: chunk,
          docid: docid,
          title: titleValue,
          createdAt: createdAtISO,
          chunkIndex: chunkIndex.toString(),
        },
      });

      // sparseRecords.push({
      //   id: datapointId,
      //   text: chunk,
      // });

      results.push(datapointId);
    }

    const batchSize = 50;
    const denseBatches = [];
    const sparseBatches = [];

    for (let i = 0; i < denseVectors.length; i += batchSize) {
      denseBatches.push(denseVectors.slice(i, i + batchSize));
      // sparseBatches.push(sparseRecords.slice(i, i + batchSize));
    }

    // Parallelize batch upserts to both indexes
    const upsertPromises = [];
    for (let i = 0; i < denseBatches.length; i++) {
      upsertPromises.push(
        pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .upsert(denseBatches[i])
          .catch((err) => console.error(`Dense batch ${i} error:`, err))
      );
      // Sparse index upsert commented out - not using sparse for responses
      // upsertPromises.push(
      //   pc
      //     .index("kavisha-sparse")
      //     .namespace(brand)
      //     .upsertRecords(sparseBatches[i])
      //     .catch((err) => console.error(`Sparse batch ${i} error:`, err))
      // );
    }

    // Wait for all upserts to complete
    await Promise.all(upsertPromises);

    await TrainingData.updateOne(
      { docid: docid },
      {
        $set: {
          text: text,
          totalChunks: totalChunks,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Successfully edited and processed ${results.length} chunks`,
      docid: docid,
      chunkIds: results,
    });
  } catch (err) {
    return NextResponse.json({ message: err }, { status: 500 });
  }
}
