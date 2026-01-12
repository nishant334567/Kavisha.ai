import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Attempts from "@/app/models/Attempt";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { attemptId } = await params;
        await connectDB();

        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          );
        }

        const attempt = await Attempts.findById(attemptId).lean();
        if (!attempt) {
          return NextResponse.json(
            { error: "Attempt not found" },
            { status: 404 }
          );
        }

        // Verify the attempt belongs to the current user
        if (attempt.userId.toString() !== user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Reconstruct user answers from report or surveyResponse if completed
        let userAnswers = [];
        if (attempt.status === "completed") {
          if (attempt.surveyResponse && Array.isArray(attempt.surveyResponse)) {
            // For surveys: use surveyResponse (contains answer text)
            userAnswers = attempt.surveyResponse.map((item) => ({
              questionId: item.questionId.toString(),
              selectedAnswers: item.selectedAnswers || [],
            }));
          } else if (attempt.report?.questionResults) {
            // For quizzes: use questionResults (contains answer IDs)
            userAnswers = attempt.report.questionResults.map((result) => ({
              questionId: result.questionId,
              selectedAnswers: result.userAnswer || [],
            }));
          }
        }

        return NextResponse.json({
          attempt: {
            id: attempt._id.toString(),
            status: attempt.status,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            correctCount: attempt.correctCount,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            report: attempt.report,
            surveyResponse: attempt.surveyResponse || null,
          },
          userAnswers,
        });
      } catch (error) {
        console.error("Error fetching attempt:", error);
        return NextResponse.json(
          { error: "Failed to fetch attempt", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
