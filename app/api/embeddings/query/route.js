import { NextResponse } from "next/server";
import { generateEmbedding } from "../../../lib/embeddings.js";
import pc from "../../../lib/pinecone.js";
export async function POST(request) {
    const { text } = await request.json();
    const embedding = await generateEmbedding(text);
    const index = pc.index("intelligent-kavisha").namespace("ns1");
    const results = await index.query({
        vector: embedding,
    topK: 2,
    includeMetadata: true,
      });
      console.log("results", results);
    return NextResponse.json({ results });
}