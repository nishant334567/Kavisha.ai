import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand");
  const page = parseInt(searchParams.get("page")) || 1;
  const docid = searchParams.get("docid");

  if (!brand) {
    return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  }

  if (docid) {
    const document = await TrainingData.findOne({ docid: docid });
    if (document) {
      return NextResponse.json({ document: document }, { status: 200 });
    }
    return NextResponse.json({ message: "Failed to fetch" }, { status: 500 });
  }

  const limit = 10;
  const skip = (page - 1) * limit;

  let documents, totalCount;
  [documents, totalCount] = await Promise.all([
    TrainingData.find({ brand })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TrainingData.countDocuments({ brand }),
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
    const docid = searchParams.get("docid"); // Keeping query param name for backward compatibility
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

      // await pc
      //   .index("kavisha-sparse")
      //   .namespace(brand)
      //   .deleteMany({
      //     docid: { $eq: docid },
      //   });
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
