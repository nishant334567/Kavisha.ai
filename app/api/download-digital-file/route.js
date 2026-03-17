import { NextResponse } from "next/server";
import { verifyDownloadToken } from "@/app/lib/download-token";
import { bucket } from "@/app/lib/gcs";

const MIME_BY_EXT = {
  pdf: "application/pdf",
  mp4: "video/mp4",
  wav: "audio/wav",
  zip: "application/zip",
};

function getMimeType(filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

/** GET ?token=... — verify token, stream file from GCS with Content-Disposition: attachment so browser downloads. */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const payload = verifyDownloadToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    if (!bucket) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const file = bucket.file(payload.gcsPath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const filename = payload.filename || "download";
    const contentType = getMimeType(filename);
    const safeFilename = filename.replace(/[^\w.-]/g, "_") || "download";

    const [buffer] = await file.download();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    console.error("download-digital-file:", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
