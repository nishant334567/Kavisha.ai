import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import Chunks from "@/app/models/Chunks";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand");
  const page = parseInt(searchParams.get("page")) || 1;
  const type = searchParams.get("type") || "docs"; // "docs" or "chunks"

  if (!brand) {
    return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  }

  const limit = 10;
  const skip = (page - 1) * limit;

  let chunks, totalCount;

  if (type === "chunks") {
    // Fetch from old Chunks model
    [chunks, totalCount] = await Promise.all([
      Chunks.find({ brand }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Chunks.countDocuments({ brand }),
    ]);
  } else {
    // Fetch from new TrainingData model (docs)
    [chunks, totalCount] = await Promise.all([
      TrainingData.find({ brand })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TrainingData.countDocuments({ brand }),
    ]);
  }

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    chunks,
    totalPages,
    currentPage: page,
    totalCount,
  });
}
