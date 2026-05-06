import { NextResponse } from "next/server";
import Session from "@/app/models/ChatSessions";
import { connectDB } from "@/app/lib/db";

export async function GET(req, { params }) {
  try {
    const { sessionId } = await params;
    if (!sessionId || sessionId === "undefined") {
      return NextResponse.json(
        { error: "Missing or invalid sessionId" },
        { status: 400 }
      );
    }
    await connectDB();
    const session = await Session.findOne({ _id: sessionId });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const MATCH_ELIGIBLE_ONBOARDING_PERCENT = 40;
    const onboardingPercent =
      session.allDataCollected === true
        ? 100
        : Math.max(0, Math.min(100, Number(session.onboardingPercent) || 0));
    const eligibleForMatches =
      session.allDataCollected === true ||
      onboardingPercent >= MATCH_ELIGIBLE_ONBOARDING_PERCENT;
    return NextResponse.json({
      allDataCollected: !!session.allDataCollected,
      onboardingPercent,
      eligibleForMatches,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
