import { NextResponse } from "next/server";
import pc from "../../lib/pinecone.js";
import { generateEmbedding } from "../../lib/embeddings.js";
import TrainingData from "@/app/models/TrainingData.js";
import { connectDB } from "@/app/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const { text, brand, title, description } = await request.json();

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
    const chunkSize = 600;

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

    // Prepare description prefix for embedding (improves vector search quality)
    const descriptionPrefix = descriptionValue
      ? `[Context: ${descriptionValue}]\n\n`
      : "";

    // Process each chunk and upload to Pinecone
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      const chunkIndex = Math.floor(i / chunkSize);
      const datapointId = `chunk_${Date.now()}_${chunkIndex}`;

      try {
        // Prepend description to chunk before embedding (this improves vector search)
        // The description provides semantic context that influences the embedding
        const chunkWithContext = descriptionPrefix + chunk;
        const embedding = await generateEmbedding(chunkWithContext);

        if (embedding === 0) {
          continue;
        }

        await pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .upsert([
            {
              id: datapointId,
              values: embedding,
              metadata: {
                text: chunk, // Original chunk without description prefix
                docid: docId,
                title: titleValue,
                description: descriptionValue, // Store for filtering/metadata queries
                createdAt: createdAtISO,
                chunkIndex: chunkIndex.toString(),
              },
            },
          ]);

        results.push(datapointId);
      } catch (chunkError) {}
    }

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
