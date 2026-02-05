import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";
import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const chunkId = searchParams.get("chunkId");
  const brand = searchParams.get("brand");

  if (!chunkId || !brand) {
    return NextResponse.json(
      { error: "chunkId and brand are required" },
      { status: 400 }
    );
  }

  const result = await pc
    .index("intelligent-kavisha")
    .namespace(brand)
    .fetch([chunkId]);

  const record = result.records?.[chunkId];
  if (!record) {
    return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
  }

  const chunk = {
    id: record.id,
    text: record.metadata?.text || record.text || "",
    title: record.metadata?.title || record.title || "",
  };

  let document = null;
  let docid = record.metadata?.docid ?? record.docid ?? null;
  if (!docid && chunkId && typeof chunkId === "string") {
    const i = chunkId.lastIndexOf("_");
    if (i !== -1 && /^\d+$/.test(chunkId.slice(i + 1))) docid = chunkId.slice(0, i);
  }
  if (docid) {
    await connectDB();
    const doc = await TrainingData.findOne({ docid, brand }).select("title text").lean();
    if (doc) document = { title: doc.title || "", text: doc.text || "" };
  }

  return NextResponse.json({ chunk, document });
}
