import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import Assessments from "@/app/models/Assessment";
import Questions from "@/app/models/Questions";
import Attempts from "@/app/models/Attempt";
import getGeminiModel from "@/app/lib/getAiModel";

function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.33);
}

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { quizid, selectedAnswersArray, attemptId } =
          await request.json();
        await connectDB();

        // Fetch assessment to check if it's a survey
        const assessment = await Assessments.findById(quizid).lean();
        if (!assessment) {
          return NextResponse.json(
            { error: "Assessment not found" },
            { status: 404 }
          );
        }

        const questions = await Questions.find({ assessmentId: quizid })
          .sort({ order: 1 })
          .lean();

        // Handle surveys differently
        if (assessment.type === "survey") {
          // Build surveyResponse with question text and answer text (not IDs)
          const surveyResponse = questions.map((question) => {
            const questionId = question._id.toString();
            const userAnswer = selectedAnswersArray.find(
              (ans) => ans.questionId === questionId
            );
            const selectedOptionIds = userAnswer?.selectedAnswers || [];

            // Get answer text values instead of IDs
            const selectedAnswerTexts = selectedOptionIds.map((optionId) => {
              const option = question.options?.find(
                (opt) => opt.id === optionId
              );
              return option?.text || optionId;
            });

            return {
              questionText: question.questionText,
              questionId: question._id,
              selectedAnswers: selectedAnswerTexts,
            };
          });

          // Prepare LLM prompt with survey data
          let llmAnalysis = null;
          try {
            const model = getGeminiModel("gemini-2.5-flash");
            if (model) {
              const surveyDataText = surveyResponse
                .map(
                  (item, index) =>
                    `${index + 1}. ${item.questionText}\n   Answer: ${item.selectedAnswers.join(", ")}`
                )
                .join("\n\n");

              const prompt = `You are scoring a survey. Use ONLY the data and rules below. Do NOT add your own analysis, insights, or recommendations.

SURVEY TITLE: ${assessment.title}
${assessment.subtitle ? `SUBTITLE: ${assessment.subtitle}` : ""}

RESPONSE SCALE/LEGEND:
${assessment.legend || "Not provided"}

SCORING INSTRUCTIONS:
${assessment.scoringInfo || "Not provided"}

TRENDS/INTERPRETATION GUIDE:
${assessment.trends || "Not provided"}

SURVEY RESPONSES:
${surveyDataText}

Output ONLY:
1. **Score** – Calculate the score strictly using the SCORING INSTRUCTIONS above and the SURVEY RESPONSES. Show the numeric/result.
2. **Interpretation** – Copy or summarize ONLY what applies from the TRENDS/INTERPRETATION GUIDE for this score. Do not add your own feedback.

Format:
- Use **bold** for the two section headings (**Score**, **Interpretation**).
- Put a blank line between sections. Valid Markdown only, no HTML.
- Do not include analysis, insights, recommendations, or any text not derived from the scoring instructions and trends guide.`;

              const geminiContents = [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ];

              const responseGemini = await model.generateContent({
                contents: geminiContents,
              });

              llmAnalysis =
                responseGemini.response.candidates[0].content.parts[0].text;
            }
          } catch (llmError) {
            console.error("Error generating LLM analysis:", llmError);
            llmAnalysis = "Report could not be generated at this time.";
          }

          // Update attempt with survey response and LLM analysis
          if (attemptId) {
            await Attempts.findByIdAndUpdate(attemptId, {
              status: "completed",
              completedAt: new Date(),
              surveyResponse: surveyResponse,
              report: {
                llmAnalysis: llmAnalysis,
                generatedAt: new Date(),
              },
            });
          }

          return NextResponse.json({
            success: true,
            type: "survey",
            surveyResponse: surveyResponse,
            report: {
              llmAnalysis: llmAnalysis,
            },
          });
        }

        // Original quiz logic

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
