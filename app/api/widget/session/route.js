import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { getLeadJourneyServices } from "@/app/lib/brandRepository";

const fail = (message, status) =>
  NextResponse.json({ success: false, error: message }, { status });

/** Create a new lead journey session marked isWidget for embed */
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const dbUser = await createOrGetUser(decodedToken);
      const user = { id: dbUser._id.toString() };

      let body;
      try {
        body = await request.json();
      } catch {
        return fail("Invalid JSON", 400);
      }

      const brand = String(body?.brand ?? "").trim();
      if (!brand) return fail("brand is required", 400);

      const leads = await getLeadJourneyServices(brand);
      if (!leads.length) {
        return fail("This brand has no lead journey service", 400);
      }

      const requestedKey = String(body?.serviceKey ?? "").trim();
      let selected;
      if (requestedKey) {
        selected = leads.find((s) => s.serviceKey === requestedKey);
        if (!selected) {
          return fail("Invalid lead journey for this brand", 400);
        }
      } else {
        selected = leads[0];
      }

      const serviceKey = selected.serviceKey;
      const initialMessage = String(selected.initialMessage ?? "").trim();
      if (!initialMessage) {
        return fail(
          "Lead journey has no ChatBot Initial Message — set it on the service.",
          400
        );
      }

      try {
        const session = await createSessionWithDefaultLog(
          user.id,
          "lead_journey",
          brand,
          initialMessage,
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
