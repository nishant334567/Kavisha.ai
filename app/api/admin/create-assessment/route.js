import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        await connectDB();
        const body = await req.json();
        const { assessment, questions } = body;

        // Check if requester is admin for this brand
        const isAdmin = await isBrandAdmin(
          decodedToken.email,
          assessment?.brand
        );
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Validate assessment data
        if (!assessment?.brand || !assessment?.type || !assessment?.title) {
          return NextResponse.json(
            { error: "Brand, type, and title are required" },
            { status: 400 }
          );
        }

        // Validate questions
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          return NextResponse.json(
            { error: "At least one question is required" },
            { status: 400 }
          );
        }

        // Validate each question
        for (const q of questions) {
          if (!q.questionText?.trim()) {
            return NextResponse.json(
              { error: "All questions must have text" },
              { status: 400 }
            );
          }
          if (
            !q.questionType ||
            !["single_choice", "multi_choice"].includes(q.questionType)
          ) {
            return NextResponse.json(
              { error: "Invalid question type" },
              { status: 400 }
            );
          }
          if (!q.options || q.options.length === 0) {
            return NextResponse.json(
              { error: "All questions must have at least one option" },
              { status: 400 }
            );
          }
        }

        // Create assessment
        const assessmentDoc = await Assessments.create({
          brand: assessment.brand,
          type: assessment.type,
          title: assessment.title,
          subtitle: assessment.subtitle || "",
          objective: assessment.objective || "",
          instructions: assessment.instructions || "",
          gradingMode: assessment.gradingMode || "none",
          totalMarks: assessment.totalMarks || null,
          durationInMinutes: assessment.durationInMinutes || null,
        });

        // Create questions
        const questionDocs = await Questions.insertMany(
          questions.map((q, index) => ({
            assessmentId: assessmentDoc._id,
            questionText: q.questionText.trim(),
            questionType: q.questionType,
            options: q.options.map((opt) => ({
              id: opt.id || `opt_${Date.now()}_${Math.random()}`,
              text: opt.text.trim(),
            })),
            correctAnswer: q.correctAnswer || null,
            evaluationHint: q.evaluationHint || "",
            maxMarks: q.maxMarks || 1,
            order: q.order || index + 1,
            required: q.required !== undefined ? q.required : true,
          }))
        );

        return NextResponse.json(
          {
            success: true,
            assessment: assessmentDoc,
            questions: questionDocs,
            assessmentId: assessmentDoc._id,
          },
          { status: 201 }
        );
      } catch (error) {
        console.error("Error creating assessment:", error);
        return NextResponse.json(
          { error: "Failed to create assessment", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
