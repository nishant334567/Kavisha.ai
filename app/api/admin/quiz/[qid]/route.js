import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

// GET - Fetch assessment and its questions
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

        // Fetch all questions for this assessment
        const questions = await Questions.find({ assessmentId: qid })
          .sort({ order: 1 })
          .lean();

        return NextResponse.json({
          assessment: {
            id: assessment._id.toString(),
            brand: assessment.brand,
            type: assessment.type,
            title: assessment.title,
            subtitle: assessment.subtitle,
            objective: assessment.objective,
            instructions: assessment.instructions,
            totalMarks: assessment.totalMarks,
            durationInMinutes: assessment.durationInMinutes,
            legend: assessment.legend || null,
            scoringInfo: assessment.scoringInfo || null,
            trends: assessment.trends || null,
            createdAt: assessment.createdAt,
            updatedAt: assessment.updatedAt,
          },
          questions: questions.map((q) => ({
            id: q._id.toString(),
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
            evaluationHint: q.evaluationHint,
            maxMarks: q.maxMarks,
            order: q.order,
            required: q.required,
          })),
        });
      } catch (error) {
        console.error("Error fetching quiz:", error);
        return NextResponse.json(
          { error: "Failed to fetch quiz", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

// PATCH - Update assessment and optionally questions
export async function PATCH(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { qid } = await params;
        const body = await req.json();
        const { assessment, questions } = body;

        if (!qid) {
          return NextResponse.json(
            { error: "Quiz ID is required" },
            { status: 400 }
          );
        }

        await connectDB();

        // Fetch existing assessment to check brand
        const existingAssessment = await Assessments.findById(qid);
        if (!existingAssessment) {
          return NextResponse.json(
            { error: "Quiz not found" },
            { status: 404 }
          );
        }

        // Check if user is admin for this brand
        const isAdmin = await isBrandAdmin(
          decodedToken.email,
          existingAssessment.brand
        );
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Update assessment if provided
        if (assessment) {
          const updateData = {};
          if (assessment.title !== undefined)
            updateData.title = assessment.title;
          if (assessment.subtitle !== undefined)
            updateData.subtitle = assessment.subtitle;
          if (assessment.objective !== undefined)
            updateData.objective = assessment.objective;
          if (assessment.instructions !== undefined)
            updateData.instructions = assessment.instructions;
          if (assessment.totalMarks !== undefined)
            updateData.totalMarks = assessment.totalMarks;
          if (assessment.durationInMinutes !== undefined)
            updateData.durationInMinutes = assessment.durationInMinutes;
          if (assessment.legend !== undefined)
            updateData.legend = assessment.legend;
          if (assessment.scoringInfo !== undefined)
            updateData.scoringInfo = assessment.scoringInfo;
          if (assessment.trends !== undefined)
            updateData.trends = assessment.trends;

          await Assessments.findByIdAndUpdate(qid, updateData);
        }

        // Update questions if provided
        if (questions && Array.isArray(questions)) {
          // Delete existing questions
          await Questions.deleteMany({ assessmentId: qid });

          // Insert new questions
          if (questions.length > 0) {
            await Questions.insertMany(
              questions.map((q, index) => ({
                assessmentId: qid,
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
          }
        }

        // Fetch updated assessment
        const updatedAssessment = await Assessments.findById(qid).lean();
        const updatedQuestions = await Questions.find({ assessmentId: qid })
          .sort({ order: 1 })
          .lean();

        return NextResponse.json({
          success: true,
          assessment: {
            id: updatedAssessment._id.toString(),
            brand: updatedAssessment.brand,
            type: updatedAssessment.type,
            title: updatedAssessment.title,
            subtitle: updatedAssessment.subtitle,
            objective: updatedAssessment.objective,
            instructions: updatedAssessment.instructions,
            totalMarks: updatedAssessment.totalMarks,
            durationInMinutes: updatedAssessment.durationInMinutes,
            legend: updatedAssessment.legend || null,
            scoringInfo: updatedAssessment.scoringInfo || null,
            trends: updatedAssessment.trends || null,
            updatedAt: updatedAssessment.updatedAt,
          },
          questions: updatedQuestions.map((q) => ({
            id: q._id.toString(),
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            correctAnswer: q.correctAnswer,
            evaluationHint: q.evaluationHint,
            maxMarks: q.maxMarks,
            order: q.order,
            required: q.required,
          })),
        });
      } catch (error) {
        console.error("Error updating quiz:", error);
        return NextResponse.json(
          { error: "Failed to update quiz", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

// DELETE - Delete assessment and all its questions
export async function DELETE(req, { params }) {
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
        const assessment = await Assessments.findById(qid);
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

        // Delete all questions first
        await Questions.deleteMany({ assessmentId: qid });

        // Delete assessment
        await Assessments.findByIdAndDelete(qid);

        return NextResponse.json({
          success: true,
          message: "Quiz deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting quiz:", error);
        return NextResponse.json(
          { error: "Failed to delete quiz", details: error.message },
          { status: 500 }
        );
      }
    },
  });
}
