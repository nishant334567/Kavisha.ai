import { connectDB } from "@/app/lib/db";
import Chunks from "@/app/models/Chunks";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const chunkId = searchParams.get("chunkId");
    const brand = searchParams.get("brand");

    if (!chunkId) {
      return NextResponse.json(
        { error: "Chunk ID is required" },
        { status: 400 }
      );
    }

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    await connectDB();

    // Delete from MongoDB
    const deletedChunk = await Chunks.findOneAndDelete({ chunkId });

    if (!deletedChunk) {
      return NextResponse.json(
        { error: "Chunk not found in database" },
        { status: 404 }
      );
    }

    // Delete from Pinecone
    if (pc) {
      try {
        await pc
          .index("intelligent-kavisha")
          .namespace(brand)
          .deleteOne(chunkId);
      } catch (pineconeError) {
        console.error("Error deleting from Pinecone:", pineconeError);
        // Continue even if Pinecone deletion fails, as MongoDB deletion succeeded
      }
    }

    return NextResponse.json({
      success: true,
      message: "Chunk deleted successfully",
      deletedChunkId: chunkId,
    });
  } catch (error) {
    console.error("Error deleting chunk:", error);
    return NextResponse.json(
      { error: "Failed to delete chunk", details: error.message },
      { status: 500 }
    );
  }
}
