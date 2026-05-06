import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";
import { getMatches } from "../route";

export async function POST(request, { params }) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId } = await params;
        if (!sessionId || sessionId === "undefined") {
          return NextResponse.json(
            { error: "Missing sessionId" },
            { status: 400 }
          );
        }

        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await connectDB();
        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (String(session.userId) !== String(user.id)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const MATCH_ELIGIBLE_ONBOARDING_PERCENT = 40;
        const eligibleForMatches =
          session.allDataCollected === true ||
          (typeof session.onboardingPercent === "number" &&
            !Number.isNaN(session.onboardingPercent) &&
            session.onboardingPercent >= MATCH_ELIGIBLE_ONBOARDING_PERCENT);

        if (!eligibleForMatches) {
          return NextResponse.json(
            {
              error: "Complete more of your profile before refreshing matches.",
              code: "NOT_READY",
            },
            { status: 400 }
          );
        }

        const role = String(session.role || "");
        if (role.toLowerCase() === "pitch_to_investor") {
          return NextResponse.json({
            matches: [],
            refreshedAt: new Date().toISOString(),
            allDataCollected: Boolean(session.allDataCollected),
            eligibleForMatches,
          });
        }

        const matches = await getMatches(user.id, sessionId, role);

        return NextResponse.json({
          matches: Array.isArray(matches) ? matches : [],
          refreshedAt: new Date().toISOString(),
          allDataCollected: Boolean(session.allDataCollected),
          eligibleForMatches,
        });
      } catch (e) {
        console.error("[matches/refresh]", e);
        return NextResponse.json(
          { error: e?.message || "Refresh failed" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
