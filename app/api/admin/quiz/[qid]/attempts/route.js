import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Attempts from "@/app/models/Attempt";
import User from "@/app/models/Users";
import Assessments from "@/app/models/Assessment";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { qid } = await params;

        if (!qid) {
          return NextResponse.json(
            { error: "Quiz ID is required" },
            { status: 400 }
          );
        }

        await connectDB();

        // Fetch assessment to check brand
        const assessment = await Assessments.findById(qid).lean();
        if (!assessment) {
          return NextResponse.json(
            { error: "Quiz not found" },
            { status: 404 }
          );
        }

        // Check if user is admin for this brand
        const isAdmin = await isBrandAdmin(
          decodedToken.email,
          assessment.brand
        );
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Fetch all attempts for this assessment
        const attempts = await Attempts.find({ assessmentId: qid })
          .populate("userId", "name email image")
          .sort({ createdAt: -1 })
          .lean();

        // Group attempts by user
        const attemptsByUser = {};
        attempts.forEach((attempt) => {
          // Handle case where user might not be populated or deleted
          if (!attempt.userId || typeof attempt.userId !== "object") {
            return; // Skip attempts with invalid user references
          }

          const userId =
            attempt.userId._id?.toString() || attempt.userId.toString();
          if (!attemptsByUser[userId]) {
            attemptsByUser[userId] = {
              user: {
                id: userId,
                name: attempt.userId.name || "Unknown User",
                email: attempt.userId.email || "N/A",
                image: attempt.userId.image || null,
              },
              attempts: [],
            };
          }

          // Calculate time taken if completed
          let timeTaken = null;
          if (
            attempt.status === "completed" &&
            attempt.completedAt &&
            attempt.startedAt
          ) {
            const startTime = new Date(attempt.startedAt);
            const endTime = new Date(attempt.completedAt);
            const diffMs = endTime - startTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);
            timeTaken = `${diffMins}m ${diffSecs}s`;
          }

          attemptsByUser[userId].attempts.push({
            id: attempt._id.toString(),
            status: attempt.status,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            correctCount: attempt.correctCount,
            percentage: attempt.report?.percentage || null,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            timeTaken,
            createdAt: attempt.createdAt,
          });
        });

        // Convert to array format
        const groupedAttempts = Object.values(attemptsByUser);

        return NextResponse.json({
          quiz: {
            id: assessment._id.toString(),
            title: assessment.title,
            totalMarks: assessment.totalMarks,
          },
          attemptsByUser: groupedAttempts,
        });
      } catch (error) {
        console.error("Error fetching attempts:", error);
        return NextResponse.json(
          { error: "Failed to fetch attempts", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
