import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { client as sanity } from "@/app/lib/sanity";

const fail = (message, status) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const { role, brand, initialmessage, isCommunityChat, chatName, serviceKey } =
        await request.json();

      const user = await getUserFromDB(decodedToken.email);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (!brand) return fail("Failed to create a session. Brand is required.", 400);

      const sk = String(serviceKey ?? "").trim();
      if (!sk) return fail("Failed to create a session. Service is required.", 400);

      if (!sanity) return fail("Failed to create a session. Service configuration unavailable.", 500);

      const { serviceKeys = [] } = (await sanity.fetch(
        `*[_type == "brand" && subdomain == $brand][0]{ "serviceKeys": services[]._key }`,
        { brand }
      )) || {};
      if (!serviceKeys.includes(sk)) return fail("Failed to create a session. Invalid service.", 400);

      try {
        const session = await createSessionWithDefaultLog(
          user.id,
          role,
          brand,
          initialmessage || null,
          isCommunityChat,
          chatName,
          sk
        );
        return NextResponse.json({ success: true, sessionId: session._id });
      } catch (err) {
        console.error("[newchatsession] createSessionWithDefaultLog error:", err);
        return fail("Failed to create a session.", 500);
      }
    },
  });
}
