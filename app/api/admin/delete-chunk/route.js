import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const docid = searchParams.get("chunkId"); // Keeping query param name for backward compatibility
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

    // Delete from MongoDB by docid
    const deletedChunk = await TrainingData.findOneAndDelete({ docid });

    if (!deletedChunk) {
      return NextResponse.json(
        { error: "Document not found in database" },
        { status: 404 }
      );
    }

    // Delete all chunks from both Pinecone indexes with this docid
    if (pc) {
      try {
        // Delete from dense vector index
        await pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .deleteMany({
            docid: { $eq: docid },
          });

        // Delete from sparse vector index
        await pc
          .index("kavisha-sparse")
          .namespace(brand)
          .deleteMany({
            docid: { $eq: docid },
          });
      } catch (pineconeError) {
        console.error("Pinecone delete error:", pineconeError);
      }
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
