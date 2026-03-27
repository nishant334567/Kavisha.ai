import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { client as sanity } from "@/app/lib/sanity";

const fail = (message, status) =>
  NextResponse.json({ success: false, error: message }, { status });

/** List all lead_journey services configured for a brand (for widget picker) */
export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);
      if (!user) return fail("User not found", 404);

      const brand = request.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) return fail("brand is required", 400);
      if (!sanity) return fail("Service configuration unavailable", 500);

      const data = await sanity.fetch(
        `*[_type == "brand" && subdomain == $brand][0]{
          "services": services[]{ _key, name, title }
        }`,
        { brand }
      );

      const services = (data?.services || [])
        .filter(
          (s) => String(s?.name || "").toLowerCase() === "lead_journey"
        )
        .map((s) => ({
          serviceKey: s._key,
          title: (s.title && String(s.title).trim()) || "Lead journey",
        }))
        .filter((s) => s.serviceKey);

      return NextResponse.json({ success: true, services });
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
