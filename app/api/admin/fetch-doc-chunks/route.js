import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";
import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const docid = searchParams.get("docid");
  const brand = searchParams.get("brand");

  if (!docid || !brand) {
    return NextResponse.json(
      { error: "docid and brand are required" },
      { status: 400 }
    );
  }

  await connectDB();

  // Find the training document to know how many chunks to fetch
  const doc = await TrainingData.findOne({ docid, brand });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const totalChunks = doc.totalChunks || 0;
  if (totalChunks === 0) {
    return NextResponse.json({ chunks: [], totalChunks: 0 }, { status: 200 });
  }

  const chunkIds = Array(totalChunks)
    .fill(null)
    .map((_, index) => `${docid}_${index}`);

  const result = await pc
    .index("intelligent-kavisha")
    .namespace(brand)
    .fetch(chunkIds);

  const records = result?.records || {};
  const chunks = Object.keys(records)
    .map((id) => {
      const record = records[id];
      const rawIndex = record.metadata?.chunkIndex ?? null;
      const numIndex =
        typeof rawIndex === "string" ? parseInt(rawIndex, 10) : rawIndex;
      return {
        id,
        text: record.metadata?.text || record.text || "",
        title: record.metadata?.title || record.title || "",
        chunkIndex: Number.isFinite(numIndex) ? numIndex : null,
      };
    })

    .sort((a, b) => {
      return a.chunkIndex - b.chunkIndex;
    });

  return NextResponse.json(
    { chunks, totalChunks: chunks.length },
    { status: 200 }
  );
}
