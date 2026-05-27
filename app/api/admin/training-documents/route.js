import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";

export async function PATCH(req) {
  try {
    const { docids, folderId, brand } = await req.json();
    if (!brand || !Array.isArray(docids) || docids.length === 0) {
      return NextResponse.json(
        { error: "brand and non-empty docids array required" },
        { status: 400 }
      );
    }
    await connectDB();
    const targetFolderId =
      folderId === "" || folderId == null ? null : folderId;
    const { modifiedCount } = await TrainingData.updateMany(
      { docid: { $in: docids }, brand },
      { $set: { folderId: targetFolderId, updatedAt: new Date() } }
    );
    return NextResponse.json({
      success: true,
      modifiedCount,
      message: `Moved ${modifiedCount} document(s) to folder`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to move documents", details: error.message },
      { status: 500 }
    );
  }
}

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

  const limit = 100;
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

async function deleteVectorsForDocids(brand, docids) {
  const unique = [...new Set(docids.filter(Boolean))];
  if (!unique.length) return;

  const filter =
    unique.length === 1
      ? { docid: { $eq: unique[0] } }
      : { docid: { $in: unique } };

  await Promise.all([
    pc.index("intelligent-kavisha").namespace(brand).deleteMany(filter),
    pc.index("kavisha-sparse").namespace(brand).deleteMany(filter),
  ]);
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const singleDocid = searchParams.get("docid");
    let brand = searchParams.get("brand");
    let docids = singleDocid ? [singleDocid] : null;

    if (!docids) {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await req.json();
        brand = body?.brand || brand;
        if (Array.isArray(body?.docids) && body.docids.length > 0) {
          docids = body.docids;
        }
      }
    }

    if (!docids?.length) {
      return NextResponse.json(
        { error: "Document ID or docids array is required" },
        { status: 400 }
      );
    }

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const uniqueDocids = [...new Set(docids.map((id) => String(id).trim()).filter(Boolean))];
    await connectDB();

    try {
      await deleteVectorsForDocids(brand, uniqueDocids);
    } catch (pineconeError) {
      return NextResponse.json(
        { error: "Failed to delete vectors", details: pineconeError.message },
        { status: 500 }
      );
    }

    const { deletedCount } = await TrainingData.deleteMany({
      docid: { $in: uniqueDocids },
      brand,
    });

    if (deletedCount === 0) {
      return NextResponse.json(
        { error: "No matching documents found" },
        { status: 404 }
      );
    }

    const isBulk = uniqueDocids.length > 1;
    return NextResponse.json({
      success: true,
      message: isBulk
        ? `Deleted ${deletedCount} document(s)`
        : "Document deleted successfully",
      deletedCount,
      deletedDocids: uniqueDocids,
      ...(isBulk ? {} : { deletedDocid: uniqueDocids[0] }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete document(s)", details: error.message },
      { status: 500 }
    );
  }
}
