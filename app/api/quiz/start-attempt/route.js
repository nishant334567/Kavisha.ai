import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Attempts from "@/app/models/Attempt";
import Assessments from "@/app/models/Assessment";

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { assessmentId } = await request.json();

        if (!assessmentId) {
          return NextResponse.json(
            { error: "Assessment ID is required" },
            { status: 400 }
          );
        }

        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();

        const assessment = await Assessments.findById(assessmentId).lean();
        if (!assessment) {
          return NextResponse.json(
            { error: "Assessment not found" },
            { status: 404 }
          );
        }
        if (assessment.status && assessment.status !== "published") {
          return NextResponse.json(
            { error: "This quiz is not available" },
            { status: 403 }
          );
        }

        // Check if there's already an in-progress attempt for this user and assessment
        let attempt = await Attempts.findOne({
          userId: user.id,
          assessmentId,
          status: "in-progress",
        });

        // If no in-progress attempt exists, create a new one
        if (!attempt) {
          attempt = await Attempts.create({
            userId: user.id,
            assessmentId,
            status: "in-progress",
            startedAt: new Date(),
          });
        }

        return NextResponse.json({
          attemptId: attempt._id.toString(),
          status: attempt.status,
        });
      } catch (error) {
        console.error("Error creating attempt:", error);
        return NextResponse.json(
          { error: "Failed to create attempt", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
