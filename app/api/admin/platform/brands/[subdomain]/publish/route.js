import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  getBrandBySubdomain,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";

export async function PATCH(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const isPlatformAdmin = await isBrandAdmin(
        decodedToken.email,
        "kavisha"
      );
      if (!isPlatformAdmin) {
        return NextResponse.json(
          { error: "Forbidden - platform admin only" },
          { status: 403 },
        );
      }

      const targetSubdomain = String(params?.subdomain || "")
        .trim()
        .toLowerCase();
      if (!targetSubdomain || targetSubdomain === "kavisha") {
        return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
      }

      const { published } = await req.json();
      if (typeof published !== "boolean") {
        return NextResponse.json(
          { error: "published must be a boolean" },
          { status: 400 },
        );
      }

      const existing = await getBrandBySubdomain(targetSubdomain);
      if (!existing) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const updated = await updateBrandBySubdomain(targetSubdomain, {
        set: { talkToAvatarPublished: published },
      });

      return NextResponse.json({
        subdomain: targetSubdomain,
        talkToAvatarPublished: updated?.talkToAvatarPublished !== false,
      });
    },
  });
}
