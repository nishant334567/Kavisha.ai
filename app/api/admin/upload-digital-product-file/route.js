import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/gcs";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

const ALLOWED = [
  { mime: "application/pdf", ext: "pdf" },
  { mime: "video/mp4", ext: "mp4" },
  { mime: "audio/wav", ext: "wav" },
  { mime: "audio/x-wav", ext: "wav" },
  { mime: "application/zip", ext: "zip" },
];
const ALLOWED_MIMES = new Set(ALLOWED.map((a) => a.mime));
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function getExt(file) {
  const mime = (file.type || "").toLowerCase();
  const found = ALLOWED.find((a) => a.mime === mime);
  if (found) return found.ext;
  const name = file.name || "";
  const m = /\.(pdf|mp4|wav|zip)$/i.exec(name);
  return m ? m[1].toLowerCase() : "bin";
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        const brand = (formData.get("brand") || "").toString().trim().toLowerCase();
        const productId = (formData.get("productId") || "").toString().trim();

        if (!file || !brand) {
          return NextResponse.json(
            { error: "file and brand are required" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const mime = (file.type || "").toLowerCase();
        if (!ALLOWED_MIMES.has(mime)) {
          return NextResponse.json(
            { error: "Only PDF, MP4, WAV, and ZIP files are allowed" },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > MAX_SIZE) {
          return NextResponse.json(
            { error: "File must be under 100MB" },
            { status: 400 }
          );
        }

        if (!bucket) {
          return NextResponse.json(
            { error: "File storage is not configured" },
            { status: 500 }
          );
        }

        const ext = getExt(file);
        const pathSegment = productId || "draft";
        const gcsPath = `product-files/${brand}/${pathSegment}/${uuidv4()}.${ext}`;
        const gcsFile = bucket.file(gcsPath);
        await gcsFile.save(buffer, {
          contentType: file.type || mime,
          metadata: { cacheControl: "private, no-cache" },
        });

        const filename = (file.name || `download.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_");

        return NextResponse.json({
          gcsPath,
          filename,
          mimeType: mime,
          size: buffer.length,
        });
      } catch (e) {
        console.error("upload-digital-product-file:", e);
        return NextResponse.json(
          { error: e?.message || "Upload failed" },
          { status: 500 }
        );
      }
    },
  });
}
