import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const chunkId = searchParams.get("chunkId");
  const brand = searchParams.get("brand");

  if (!chunkId || !brand) {
    return NextResponse.json(
      { error: "Chunk ID and brand are required" },
      { status: 400 }
    );
  }

  const result = await pc
    .index("intelligent-kavisha")
    .namespace(brand)
    .fetch([chunkId]);

  const chunk = result.records?.[chunkId];
  if (!chunk) {
    return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
  }

  return NextResponse.json({
    chunk: {
      id: chunk.id,
      text: chunk.metadata?.text || "",
      title: chunk.metadata?.title || "",
    },
  });
}
