import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { getBrandService } from "@/app/lib/brandRepository";

function normalizeBrand(value) {
  return String(value || "").trim().toLowerCase();
}

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId } = await params;
        const { searchParams } = new URL(req.url);
        const expectedBrand = normalizeBrand(searchParams.get("brand"));

        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await connectDB();
        const session = await Session.findById(sessionId).select(
          "role title name brand serviceKey userId isCommunityChat onboardingPercent allDataCollected isWidget isJobsRequirementPost",
        );

        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        if (String(session.userId) !== String(user.id)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const sessionBrand = normalizeBrand(session.brand);
        if (
          expectedBrand &&
          expectedBrand !== "kavisha" &&
          sessionBrand &&
          sessionBrand !== expectedBrand
        ) {
          return NextResponse.json(
            { error: "Session belongs to another brand" },
            { status: 403 },
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
        let serviceType = "chat";
        const brand = sessionBrand;
        const serviceKey = String(session.serviceKey || "").trim();
        if (brand && serviceKey) {
          try {
            const service = await getBrandService(brand, serviceKey);
            if (service) {
              serviceType =
                String(service.type || "").toLowerCase() === "collect-data"
                  ? "collect-data"
                  : "chat";
              const raw =
                serviceType === "collect-data"
                  ? service.collectQuestions
                  : service.introquestions;
              if (Array.isArray(raw)) {
                introQuestions = raw
                  .slice(0, 5)
                  .map((q) => String(q ?? "").trim())
                  .filter(Boolean);
              }
            }
          } catch {
            introQuestions = [];
          }
        }

        return NextResponse.json({
          role: session.role,
          title: session.title,
          name: session.name,
          brand: sessionBrand,
          serviceKey: session.serviceKey || null,
          serviceType,
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
