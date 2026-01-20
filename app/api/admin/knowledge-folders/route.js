import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import KnowledgeFolder from "@/app/models/KnowledgeFolder";
import TrainingData from "@/app/models/TrainingData";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand");
  if (!brand) {
    return NextResponse.json({ error: "Brand is required" }, { status: 400 });
  }
  await connectDB();
  const folders = await KnowledgeFolder.find({ brand })
    .sort({ name: 1 })
    .lean();
  return NextResponse.json({ folders });
}

export async function POST(req) {
  try {
    const { brand, name } = await req.json();
    if (!brand?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Brand and name are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const folder = await KnowledgeFolder.create({
      brand: brand.trim(),
      name: name.trim(),
    });
    return NextResponse.json({ folder: { id: folder._id, name: folder.name } });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to create folder" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");
    const folderId = searchParams.get("folderId") || searchParams.get("fid");
    if (!brand || !folderId) {
      return NextResponse.json(
        { error: "Brand and folderId (or fid) are required" },
        { status: 400 }
      );
    }
    await connectDB();
    // Move documents in this folder to unfiled
    await TrainingData.updateMany(
      { brand, folderId },
      { $set: { folderId: null } }
    );
    const deleted = await KnowledgeFolder.findOneAndDelete({
      _id: folderId,
      brand,
    });
    if (!deleted) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedId: folderId });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete folder" },
      { status: 500 }
    );
  }
}