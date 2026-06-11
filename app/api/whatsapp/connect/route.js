import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import {
  getBrandBySubdomain,
  isBrandAdmin,
  updateBrandBySubdomain,
} from "@/app/lib/brandRepository";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const body = await req.json().catch(() => ({}));
      const brand = String(body.brand || "").trim().toLowerCase();
      const phoneNumberId = String(body.phoneNumberId || "").replace(/\D/g, "");
      const displayPhone = String(body.displayPhone || "").replace(/\D/g, "");

      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      if (!phoneNumberId) {
        return NextResponse.json({ error: "phoneNumberId required" }, { status: 400 });
      }
      if (!(await isBrandAdmin(decodedToken.email, brand))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const doc = await getBrandBySubdomain(brand);
      if (!doc) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const set = {
        "widgetLauncher.whatsappCloudPhoneNumberId": phoneNumberId,
      };
      if (displayPhone.length >= 8 && displayPhone.length <= 15) {
        set["widgetLauncher.whatsappPhoneNumberId"] = displayPhone;
      }

      await updateBrandBySubdomain(brand, { set });

      return NextResponse.json({ ok: true, phoneNumberId });
    },
  });
}
