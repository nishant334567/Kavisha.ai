import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/gcs";
import { v4 as uuidv4 } from "uuid";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function getExt(file) {
  const name = file.name || "";
  const m = /\.(jpe?g|png|gif|webp)$/i.exec(name);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("gif")) return "gif";
  if (t.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        const brand = formData.get("brand");

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

        const type = (file.type || "").toLowerCase();
        if (!ALLOWED_TYPES.includes(type)) {
          return NextResponse.json(
            { error: "Only JPEG, PNG, GIF, WebP images allowed" },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 500 * 1024) {
          return NextResponse.json(
            { error: "Image must be under 500KB" },
            { status: 400 }
          );
        }

        if (!bucket) {
          return NextResponse.json(
            { error: "Image storage is not configured" },
            { status: 500 }
          );
        }

        const ext = getExt(file);
        const gcsFileName = `email-images/${brand}/${uuidv4()}.${ext}`;

        const gcsFile = bucket.file(gcsFileName);
        await gcsFile.save(buffer, {
          contentType: file.type || "image/jpeg",
          metadata: { cacheControl: "public, max-age=31536000" },
        });

        let url = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
        try {
          await gcsFile.makePublic();
        } catch {
          const [signedUrl] = await gcsFile.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          url = signedUrl;
        }
        return NextResponse.json({ url });
      } catch (e) {
        console.error("upload-email-image:", e);
        return NextResponse.json(
          { error: e?.message || "Upload failed" },
          { status: 500 }
        );
      }
    },
  });
}
