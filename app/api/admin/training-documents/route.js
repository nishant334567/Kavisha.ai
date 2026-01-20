import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId");
  const brand = searchParams.get("brand");
  const page = parseInt(searchParams.get("page")) || 1;
  const docid = searchParams.get("docid");

  if (!brand) {
    return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  }

  // Single document by docid (folderId ignored; docid is unique)
  if (docid) {
    const document = await TrainingData.findOne({ docid, brand });
    if (document) {
      return NextResponse.json({ document }, { status: 200 });
    }
    return NextResponse.json({ message: "Failed to fetch" }, { status: 500 });
  }

  // List: build query with optional folder filter
  const query = { brand };
  if (folderId === "unfiled") {
    query.$or = [
      { folderId: null },
      { folderId: { $exists: false } },
    ];
  } else if (folderId) {
    query.folderId = folderId;
  }

  const limit = 10;
  const skip = (page - 1) * limit;

  const [documents, totalCount] = await Promise.all([
    TrainingData.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TrainingData.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    documents,
    totalPages,
    currentPage: page,
    totalCount,
  });
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const docid = searchParams.get("docid");
    const brand = searchParams.get("brand");

    if (!docid) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    await connectDB();

    try {
      await pc
        .index("intelligent-kavisha")
        .namespace(brand)
        .deleteMany({
          docid: { $eq: docid },
        });

      await pc
        .index("kavisha-sparse")
        .namespace(brand)
        .deleteMany({
          docid: { $eq: docid },
        });
    } catch (pineconeError) {
      return NextResponse.json(
        { error: "Failed to delete chunk", details: pineconeError.message },
        { status: 500 }
      );
    }

    const deletedChunk = await TrainingData.findOneAndDelete({ docid });

    if (!deletedChunk) {
      return NextResponse.json(
        { error: "Document not found in database" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      deletedDocid: docid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete chunk", details: error.message },
      { status: 500 }
    );
  }
}
