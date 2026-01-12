import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "Brand parameter is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch all assessments with question counts using aggregation
    const assessments = await Assessments.aggregate([
      { $match: { brand } },
      {
        $lookup: {
          from: "questions",
          localField: "_id",
          foreignField: "assessmentId",
          as: "questions",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          type: 1,
          createdAt: 1,
          questionCount: { $size: "$questions" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return NextResponse.json({
      quizzes: assessments.map((assessment) => ({
        id: assessment._id,
        title: assessment.title,
        type: assessment.type,
        questionCount: assessment.questionCount,
        createdAt: assessment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}
