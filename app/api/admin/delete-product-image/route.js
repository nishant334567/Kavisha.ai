import { NextResponse } from "next/server";
import { bucket } from "@/app/lib/gcs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

function getPathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
  if (!m) return null;
  const path = m[1].split("?")[0];
  return decodeURIComponent(path) || null;
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json();
        const { url, brand } = body;

        if (!url || !brand) {
          return NextResponse.json(
            { error: "url and brand are required" },
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

        const path = getPathFromUrl(url);
        if (!path || !path.startsWith("product-images/")) {
          return NextResponse.json(
            { error: "Invalid product image URL" },
            { status: 400 }
          );
        }

        if (!bucket) {
          return NextResponse.json(
            { error: "Storage is not configured" },
            { status: 500 }
          );
        }

        const gcsFile = bucket.file(path);
        await gcsFile.delete();

        return NextResponse.json({ success: true });
      } catch (e) {
        if (e?.code === 404) return NextResponse.json({ success: true });
        console.error("delete-product-image:", e);
        return NextResponse.json(
          { error: e?.message || "Delete failed" },
          { status: 500 }
        );
      }
    },
  });
}
