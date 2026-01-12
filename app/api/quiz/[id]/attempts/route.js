import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { connectDB } from "@/app/lib/db";
import Attempts from "@/app/models/Attempt";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { id } = await params;
        const user = await getUserFromDB(decodedToken.email);

        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await connectDB();

        // Fetch all attempts for this assessment by this user
        const attempts = await Attempts.find({
          assessmentId: id,
          userId: user.id,
        })
          .sort({ createdAt: -1 })
          .lean();

        return NextResponse.json({
          attempts: attempts.map((attempt) => ({
            id: attempt._id.toString(),
            status: attempt.status,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            correctCount: attempt.correctCount,
            startedAt: attempt.startedAt,
            completedAt: attempt.completedAt,
            createdAt: attempt.createdAt,
          })),
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
