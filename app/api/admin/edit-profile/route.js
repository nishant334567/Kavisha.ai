import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import {
  getBrandBySubdomain,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const body = await req.json();
      const {
        brandName,
        loginButtonText,
        title,
        subtitle,
        subdomain,
        brandHeroZoom,
        brandHeroFocusY,
        brandHeroFocusX,
      } = body;

      if (typeof subdomain !== "string" || !subdomain.trim()) {
        return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
      }

      const isAdmin = await isBrandAdmin(decodedToken.email, subdomain);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await getBrandBySubdomain(subdomain.trim());
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const updateData = {
        brandName,
        loginButtonText,
        title,
        subtitle,
      };

      if (typeof brandHeroZoom === "number" && Number.isFinite(brandHeroZoom)) {
        updateData.brandHeroZoom = Math.min(3, Math.max(1, brandHeroZoom));
      }
      if (typeof brandHeroFocusY === "number" && Number.isFinite(brandHeroFocusY)) {
        updateData.brandHeroFocusY = Math.min(
          100,
          Math.max(0, Math.round(brandHeroFocusY))
        );
      }
      if (typeof brandHeroFocusX === "number" && Number.isFinite(brandHeroFocusX)) {
        updateData.brandHeroFocusX = Math.min(
          100,
          Math.max(0, Math.round(brandHeroFocusX))
        );
      }

      const updated = await updateBrandBySubdomain(subdomain.trim(), {
        set: updateData,
      });

      return NextResponse.json(updated);
    },
  });
}
