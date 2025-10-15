import { NextResponse } from "next/server";
import pc from "../../lib/pinecone.js";
import { generateEmbedding } from "../../lib/embeddings.js";
import Chunks from "@/app/models/Chunks.js";
import { connectDB } from "@/app/lib/db";

export async function POST(request) {
  try {
    const { text, brand } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    await connectDB();

    const chunks = text.split(" ");
    const chunkSize = 600;
    const results = [];

    for (let i = 0; i < chunks.length; i += chunkSize) {
      const chunk = chunks.slice(i, i + chunkSize).join(" ");
      const datapointId = `chunk_${Date.now()}_${brand}_${i}`;

      try {
        const embedding = await generateEmbedding(chunk);

        if (embedding === 0) {
          console.error(`Failed to generate embedding for chunk ${i}`);
          continue;
        }

        await pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .upsert([
            {
              id: datapointId,
              values: embedding,
              metadata: { text: chunk },
            },
          ]);

        await Chunks.create({
          chunkId: datapointId,
          brand,
          text: chunk,
        });

        results.push(datapointId);
      } catch (chunkError) {
        console.error(`Error processing chunk at ${i}:`, chunkError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} chunks`,
      chunkIds: results,
    });
  } catch (error) {
    console.error("Error in embeddings API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
