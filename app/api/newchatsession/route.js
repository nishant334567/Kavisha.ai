import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";
import { getBrandServiceKeys } from "@/app/lib/brandRepository";

const fail = (message, status) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const {
        role,
        brand,
        initialmessage,
        isCommunityChat,
        chatName,
        serviceKey,
        isJobsRequirementPost,
      } = await request.json();

      const user = await getUserFromDB(decodedToken.email);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (!brand) return fail("Failed to create a session. Brand is required.", 400);

      const brandKey = String(brand).trim().toLowerCase();
      const sk = String(serviceKey ?? "").trim();
      if (!sk) return fail("Failed to create a session. Service is required.", 400);

      const serviceKeys = await getBrandServiceKeys(brandKey);
      if (!serviceKeys.includes(sk)) {
        return fail("Failed to create a session. Invalid service.", 400);
      }

      try {
        const session = await createSessionWithDefaultLog(
          user.id,
          role,
          brandKey,
          initialmessage || null,
          isCommunityChat,
          chatName,
          sk,
          { isJobsRequirementPost: Boolean(isJobsRequirementPost) }
        );
        return NextResponse.json({ success: true, sessionId: session._id });
      } catch (err) {
        console.error("[newchatsession] createSessionWithDefaultLog error:", err);
        return fail("Failed to create a session.", 500);
      }
    },
  });
}
