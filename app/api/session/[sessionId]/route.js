import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getBrandService } from "@/app/lib/brandRepository";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId } = await params;
        await connectDB();
        const session = await Session.findById(sessionId).select(
          "role title name brand serviceKey isCommunityChat onboardingPercent allDataCollected isWidget isJobsRequirementPost",
        );

        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        const messageCount = await Logs.countDocuments({ sessionId });

        const onboardingPercent =
          session.allDataCollected === true
            ? 100
            : Math.max(
                0,
                Math.min(100, Number(session.onboardingPercent) || 0),
              );

        let introQuestions = [];
        const brand = String(session.brand || "").trim();
        const serviceKey = String(session.serviceKey || "").trim();
        if (
          String(session.role || "").toLowerCase() === "lead_journey" &&
          brand &&
          serviceKey
        ) {
          try {
            const service = await getBrandService(brand, serviceKey);
            const raw = service?.introquestions;
            if (Array.isArray(raw)) {
              introQuestions = raw
                .slice(0, 5)
                .map((q) => String(q ?? "").trim())
                .filter(Boolean);
            }
          } catch {
            introQuestions = [];
          }
        }

        return NextResponse.json({
          role: session.role,
          title: session.title,
          name: session.name,
          serviceKey: session.serviceKey || null,
          messageCount,
          isCommunityChat: Boolean(session.isCommunityChat),
          isWidget: Boolean(session.isWidget),
          isJobsRequirementPost: Boolean(session.isJobsRequirementPost),
          onboardingPercent,
          allDataCollected: Boolean(session.allDataCollected),
          introQuestions,
        });
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to fetch session" },
          { status: 500 }
        );
      }
    },
  });
}
