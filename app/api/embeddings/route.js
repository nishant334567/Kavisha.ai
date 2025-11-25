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
      chunkSize = 200,
    } = await request.json();

    // Minimal server-side validation (security check)
    if (!text?.trim() || !brand || !title?.trim()) {
      return NextResponse.json(
        { error: "Text, brand, and title are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Generate a unique document ID with title prefix for readability
    // Format: title_shortUuid (e.g., ProductGuide2024_a1b2c3d4)
    const shortUuid = uuidv4().substring(0, 8); // First 8 chars for uniqueness
    const titleSlug = title.trim().replace(/[^a-zA-Z0-9]/g, ""); // Remove special chars
    const docId = `${titleSlug}_${shortUuid}`;
    const words = text.split(" ");
    // const chunkSize = 200;

    // Calculate total chunks that will be created
    const totalChunks = Math.ceil(words.length / chunkSize);

    // Create the document record in MongoDB
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
    const createdAtISO = createdAt.toISOString(); // Store as ISO string for Pinecone

    // Prepare all chunks first
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      const chunkIndex = Math.floor(i / chunkSize);
      const datapointId = `chunk_${Date.now()}_${chunkIndex}_${i}`;
      chunks.push({ chunk, chunkIndex, datapointId });
    }

    // Generate all embeddings in parallel (batch processing)
    const embeddingPromises = chunks.map(({ chunk }) =>
      generateEmbedding(chunk, "RETRIEVAL_DOCUMENT")
    );
    const embeddings = await Promise.all(embeddingPromises);

    // Prepare vectors for batch upsert (max 1000 records per batch)
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

      sparseRecords.push({
        id: datapointId,
        text: chunk,
      });

      results.push(datapointId);
    }

    // Batch upsert to Pinecone (process in batches of 100 for optimal performance)
    const batchSize = 100;
    const denseBatches = [];
    const sparseBatches = [];

    for (let i = 0; i < denseVectors.length; i += batchSize) {
      denseBatches.push(denseVectors.slice(i, i + batchSize));
      sparseBatches.push(sparseRecords.slice(i, i + batchSize));
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
      upsertPromises.push(
        pc
          .index("kavisha-sparse")
          .namespace(brand)
          .upsertRecords(sparseBatches[i])
          .catch((err) => console.error(`Sparse batch ${i} error:`, err))
      );
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
    const { docid, text, brand, chunkSize = 200, title } = await request.json();
    await connectDB();
    const sparseIndexNamespace = pc.index("kavisha-sparse").namespace(brand);
    const denseIndexNamespace = pc
      .index("intelligent-kavisha")
      .namespace(brand);

    await Promise.all([
      denseIndexNamespace.deleteMany({ docid: docid }),
      sparseIndexNamespace.deleteMany({ docid: docid }),
    ]);

    const arrayOfWords = text.split(" ");
    const totalWordCount = arrayOfWords.length;
    const totalNumberOfChunks = Math.ceil(totalWordCount / chunkSize);
    const batchArray = [];
    for (let i = 0; i < totalNumberOfChunks; i++) {
      const chunkText = arrayOfWords
        .slice(chunkSize * i, chunkSize * (i + 1))
        .join(" ");

      batchArray.push(chunkText);
    }

    const embeddingPromises = batchArray.map((chunk) =>
      generateEmbedding(chunk, "RETRIEVAL_DOCUMENT")
    );

    const embeddings = await Promise.all(embeddingPromises);

    const denseVectors = [];
    const sparseRecords = [];

    for (let i = 0; i < batchArray.length; i++) {
      const chunk = batchArray[i];
      const embedding = embeddings[i];

      if (!Array.isArray(embedding) || embedding === 0) {
        continue;
      }

      const datapointId = `${docid}_${i}`;
      const metadata = {
        docid: docid,
        text: chunk,
        createdAt: new Date().toISOString(),
        chunkIndex: i.toString(),
        title: title || "",
      };

      denseVectors.push({
        id: datapointId,
        values: embedding,
        metadata: metadata,
      });

      // For sparse records with integrated embedding, fields are at top level
      sparseRecords.push({
        id: datapointId,
        text: chunk,
        ...metadata, // Spread metadata fields at top level
      });
    }

    const batchSize = 90;
    const denseBatches = [];
    const sparseBatches = [];

    for (let i = 0; i < denseVectors.length; i += batchSize) {
      denseBatches.push(denseVectors.slice(i, i + batchSize));
      sparseBatches.push(sparseRecords.slice(i, i + batchSize));
    }

    const upsertPromises = [];
    for (let i = 0; i < denseBatches.length; i++) {
      upsertPromises.push(
        denseIndexNamespace
          .upsert(denseBatches[i])
          .catch((err) => console.error(`Dense batch ${i} error:`, err))
      );
      upsertPromises.push(
        sparseIndexNamespace
          .upsertRecords(sparseBatches[i])
          .catch((err) => console.error(`Sparse batch ${i} error:`, err))
      );
    }
    await Promise.all(upsertPromises);
    await TrainingData.updateOne(
      { docid: docid },
      {
        $set: {
          text: text,
          totalChunks: totalNumberOfChunks,
          chunkSize: chunkSize,
        },
      }
    );
    return NextResponse.json(
      { message: "Succesfully updated docs" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ message: err }, { status: 500 });
  }
}
