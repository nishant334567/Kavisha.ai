import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";
import Attempts from "@/app/models/Attempt";
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { quizid, selectedAnswersArray, attemptId } =
          await request.json();
        await connectDB();
        const questions = await Questions.find({ assessmentId: quizid })
          .sort({ order: 1 })
          .lean();

        let totalMarks = 0;
        let obtainedMarks = 0;
        const questionResults = [];
        questions.forEach((question) => {
          const questionId = question._id.toString();
          const userAnswer = selectedAnswersArray.find(
            (ans) => ans.questionId === questionId
          );
          const userSelected = userAnswer?.selectedAnswers || [];
          const correctAnswer = question.correctAnswer;
          totalMarks += question.maxMarks || 1;
          let isCorrect = false;
          if (question.questionType === "single_choice") {
            isCorrect = userSelected[0] === correctAnswer;
          } else {
            const userSet = new Set(userSelected);
            const correctSet = new Set(
              Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
            );

            isCorrect =
              userSet.size === correctSet.size &&
              [...userSet].every((id) => correctSet.has(id));
          }
          const marksObtained = isCorrect ? question.maxMarks || 1 : 0;
          obtainedMarks += marksObtained;

          questionResults.push({
            questionId,
            questionText: question.questionText,
            isCorrect,
            marksObtained,
            maxMarks: question.maxMarks || 1,
            userAnswer: userSelected,
            correctAnswer: Array.isArray(correctAnswer)
              ? correctAnswer
              : [correctAnswer],
          });
        });

        const correctCount = questionResults.filter((r) => r.isCorrect).length;
        const percentage = ((obtainedMarks / totalMarks) * 100).toFixed(2);

        // Update attempt if attemptId is provided
        if (attemptId) {
          await Attempts.findByIdAndUpdate(attemptId, {
            status: "completed",
            completedAt: new Date(),
            score: obtainedMarks,
            totalMarks,
            correctCount,
            report: {
              percentage: parseFloat(percentage),
              totalQuestions: questions.length,
              questionResults,
            },
          });
        }

        return NextResponse.json({
          score: obtainedMarks,
          totalMarks,
          percentage,
          correctCount,
          totalQuestions: questions.length,
          questionResults,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: "Failed to assess",
            details: error.message,
          },
          { status: 500 }
        );
      }
    },
  });
}
