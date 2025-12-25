import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/gcs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request) {
  try {
    const { title, text, brand } = await request.json();

    if (!brand || !title || !text) {
      return NextResponse.json(
        { error: "Brand, title, and text are required" },
        { status: 400 }
      );
    }

    // Save to GCS
    const fileId = uuidv4();
    const gcsFileName = `training/${brand}/${fileId}_${title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    const gcsFile = bucket.file(gcsFileName);

    await gcsFile.save(text, {
      contentType: "text/plain",
      metadata: {
        title,
        brand,
      },
    });

    const gcsPath = `gs://${bucket.name}/${gcsFileName}`;
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;

    return NextResponse.json({
      success: true,
      gcsPath,
      publicUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
