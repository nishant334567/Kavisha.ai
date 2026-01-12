import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the assessment (quiz) by ID
    const assessment = await Assessments.findById(id).lean();

    if (!assessment) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Fetch all questions for this assessment, ordered by the order field
    const questions = await Questions.find({ assessmentId: id })
      .sort({ order: 1 })
      .lean();

    // Calculate total marks if not already set
    const calculatedTotalMarks = questions.reduce(
      (sum, q) => sum + (q.maxMarks || 1),
      0
    );

    // Return quiz data with all questions and quiz-level data
    return NextResponse.json({
      quiz: {
        id: assessment._id,
        brand: assessment.brand,
        type: assessment.type,
        title: assessment.title,
        subtitle: assessment.subtitle,
        objective: assessment.objective,
        instructions: assessment.instructions,
        totalMarks: assessment.totalMarks || calculatedTotalMarks,
        durationInMinutes: assessment.durationInMinutes,
        legend: assessment.legend || null,
        scoringInfo: assessment.scoringInfo || null,
        trends: assessment.trends || null,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
      questions: questions.map((q) => ({
        id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        // correctAnswer: q.correctAnswer,
        evaluationHint: q.evaluationHint,
        maxMarks: q.maxMarks,
        order: q.order,
        required: q.required,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      questionCount: questions.length,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz", details: error.message },
      { status: 500 }
    );
  }
}
