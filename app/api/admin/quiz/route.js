import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { refreshImageUrl } from "@/app/lib/gcs";

// GET - Fetch all quizzes for admin's brand
export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
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

        // Check if user is brand admin
        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Fetch assessments for this brand
        const assessments = await Assessments.find({ brand })
          .sort({ createdAt: -1 })
          .lean();

        // Fetch question counts for each assessment
        const quizzes = await Promise.all(
          assessments.map(async (assessment) => {
            const questionCount = await Questions.countDocuments({
              assessmentId: assessment._id,
            });

            return {
              id: assessment._id.toString(),
              brand: assessment.brand,
              type: assessment.type,
              status: assessment.status || "draft",
              title: assessment.title,
              subtitle: assessment.subtitle,
              totalMarks: assessment.totalMarks,
              durationInMinutes: assessment.durationInMinutes,
              questionCount: questionCount,
              createdAt: assessment.createdAt,
              updatedAt: assessment.updatedAt,
            };
          })
        );

        return NextResponse.json({ quizzes });
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        return NextResponse.json(
          { error: "Failed to fetch quizzes", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

// POST - Create new quiz/assessment
export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        await connectDB();
        const body = await req.json();
        const { assessment, questions, status } = body;

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

        const isDraft = (assessment.status || status) === "draft";
        const questionList = Array.isArray(questions) ? questions : [];

        // Published requires at least one question; draft can have 0
        if (!isDraft && questionList.length === 0) {
          return NextResponse.json(
            { error: "At least one question is required to publish" },
            { status: 400 }
          );
        }

        // Validate each question when present
        for (const q of questionList) {
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
          status: assessment.status || status || "draft",
          subtitle: assessment.subtitle || "",
          objective: assessment.objective || "",
          instructions: assessment.instructions || "",
          totalMarks: assessment.totalMarks || null,
          durationInMinutes: assessment.durationInMinutes || null,
          legend: assessment.legend || null,
          scoringInfo: assessment.scoringInfo || null,
          trends: assessment.trends || null,
        });

        // Create questions (draft can have 0)
        const questionDocs = questionList.length > 0
          ? await Questions.insertMany(
          questionList.map((q, index) => ({
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
            images: q.images || [],
          }))
            )
          : [];

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
