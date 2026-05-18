import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getBrandBySubdomain } from "@/app/lib/brandRepository";

/** Service picker for admin chat-requests filters. */
export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = new URL(req.url).searchParams.get("brand");
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const ok = await isBrandAdmin(decodedToken.email, brand);
      if (!ok) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }
      const doc = await getBrandBySubdomain(brand);
      const services = (doc?.services || []).map((s) => ({
        _key: s._key,
        name: s.name,
        title: s.title,
      }));
      return NextResponse.json({ services });
    },
  });
}
