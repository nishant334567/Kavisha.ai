import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { client as sanity } from "@/app/lib/sanity";

const fail = (message, status) =>
  NextResponse.json({ success: false, error: message }, { status });

/** Create a new lead journey session marked isWidget for embed */
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);
      if (!user) return fail("User not found", 404);

      let body;
      try {
        body = await request.json();
      } catch {
        return fail("Invalid JSON", 400);
      }

      const brand = String(body?.brand ?? "").trim();
      if (!brand) return fail("brand is required", 400);
      if (!sanity) return fail("Service configuration unavailable", 500);

      const data = await sanity.fetch(
        `*[_type == "brand" && subdomain == $brand][0]{
          "services": services[]{ _key, name }
        }`,
        { brand }
      );

      const leads = (data?.services || []).filter(
        (s) => String(s?.name || "").toLowerCase() === "lead_journey"
      );
      if (!leads.length) {
        return fail("This brand has no lead journey service", 400);
      }

      const requestedKey = String(body?.serviceKey ?? "").trim();
      let serviceKey;
      if (requestedKey) {
        const match = leads.find((s) => s._key === requestedKey);
        if (!match) {
          return fail("Invalid lead journey for this brand", 400);
        }
        serviceKey = match._key;
      } else {
        serviceKey = leads[0]._key;
      }

      try {
        const session = await createSessionWithDefaultLog(
          user.id,
          "lead_journey",
          brand,
          null,
          false,
          null,
          serviceKey,
          { isWidget: true }
        );
        return NextResponse.json({
          success: true,
          sessionId: String(session._id),
        });
      } catch (err) {
        console.error("[widget/session POST]", err);
        return fail("Failed to create session", 500);
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
