import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getBrandBySubdomain, uploadBrandImage } from "@/app/lib/brandRepository";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        const subdomain = formData.get("subdomain");
        const imageType = formData.get("imageType");

        if (!file || !subdomain || !imageType) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, subdomain);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const brandData = await getBrandBySubdomain(subdomain);
        if (!brandData) {
          return NextResponse.json(
            { error: "Brand not found" },
            { status: 404 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadBrandImage(
          subdomain,
          String(imageType),
          buffer,
          file.name || "image.jpg"
        );

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
          { error: error.message || "Failed to upload image" },
          { status: 500 }
        );
      }
    },
  });
}
