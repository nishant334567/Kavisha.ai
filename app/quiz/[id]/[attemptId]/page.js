"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/app/components/Loader";
import ScoreCard from "@/app/components/quiz/ScoreCard";
import SurveyReportCard from "@/app/components/quiz/SurveyReportCard";
import QuestionCard from "@/app/components/quiz/QuestionCard";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuizAttempt() {
  const router = useRouter();
  const params = useParams();
  const [assessmentData, setAssessmentData] = useState();
  const [questions, setQuestions] = useState();
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizResults, setQuizResults] = useState(null);
  const [surveyReport, setSurveyReport] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSurvey, setIsSurvey] = useState(false);

  const quizId = params.id;
  const attemptId = params.attemptId;
  const storageKey = `quiz_${quizId}_${attemptId}`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch quiz data
        const quizResponse = await fetch(`/api/quiz/${quizId}`);
        const quizData = await quizResponse.json();
        setAssessmentData(quizData?.quiz);
        setQuestions(quizData?.questions);
        setIsSurvey(quizData?.quiz?.type === "survey");

        // Fetch attempt data
        const attemptResponse = await fetch(`/api/quiz/attempt/${attemptId}`);
        if (attemptResponse.ok) {
          const attemptData = await attemptResponse.json();
          const attempt = attemptData.attempt;

          if (attempt.status === "completed") {
            setIsCompleted(true);

            // For surveys, we need to map surveyResponse back to userAnswers format
            // For quizzes, use userAnswers directly
            if (attemptData.attempt.surveyResponse && quizData?.questions) {
              // Survey: convert surveyResponse to userAnswers format
              // We need to map answer text back to option IDs for display
              const surveyAnswers = attemptData.attempt.surveyResponse.map(
                (item) => {
                  // Find the question and match answer text to option IDs
                  const question = quizData.questions.find(
                    (q) => q.id === item.questionId.toString()
                  );
                  if (question) {
                    const selectedOptionIds = item.selectedAnswers
                      .map((answerText) => {
                        const option = question.options?.find(
                          (opt) => opt.text === answerText
                        );
                        return option?.id;
                      })
                      .filter(Boolean);
                    return {
                      questionId: item.questionId.toString(),
                      selectedAnswers: selectedOptionIds,
                    };
                  }
                  return {
                    questionId: item.questionId.toString(),
                    selectedAnswers: [],
                  };
                }
              );
              setUserAnswers(surveyAnswers);
            } else if (attemptData.userAnswers?.length > 0) {
              // Quiz: use userAnswers directly
              setUserAnswers(attemptData.userAnswers);
            }

            // Load results from report
            if (attempt.report) {
              if (attempt.report.llmAnalysis) {
                // Survey report
                setSurveyReport(attempt.report);
              } else {
                // Quiz results
                setQuizResults({
                  score: attempt.score,
                  totalMarks: attempt.totalMarks,
                  percentage: attempt.report.percentage,
                  correctCount: attempt.correctCount,
                  totalQuestions: attempt.report.totalQuestions,
                  questionResults: attempt.report.questionResults,
                });
              }
            }
          } else {
            // Load saved answers from localStorage for in-progress attempts
            try {
              const savedAnswers = localStorage.getItem(storageKey);
              if (savedAnswers) {
                const parsedAnswers = JSON.parse(savedAnswers);
                setUserAnswers(parsedAnswers);
              }
            } catch (error) {
              console.error("Error loading saved answers:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId, attemptId, storageKey]);

  const isOptionSelected = (questionId, optionId) => {
    const answer = userAnswers.find((ans) => ans.questionId === questionId);
    return answer ? answer.selectedAnswers.includes(optionId) : false;
  };

  const handleAnswerChange = (qid, oid, qtype) => {
    if (isCompleted) return; // Don't allow changes for completed attempts

    setUserAnswers((prev) => {
      const existingAnswerIndex = prev.findIndex(
        (ans) => ans.questionId === qid
      );

      let updated;
      if (qtype === "single_choice") {
        if (existingAnswerIndex >= 0) {
          updated = [...prev];
          updated[existingAnswerIndex] = {
            questionId: qid,
            selectedAnswers: [oid],
          };
        } else {
          updated = [...prev, { questionId: qid, selectedAnswers: [oid] }];
        }
      } else {
        if (existingAnswerIndex >= 0) {
          updated = [...prev];
          const selectedOptions = updated[existingAnswerIndex].selectedAnswers;
          const isSelected = selectedOptions.includes(oid);

          updated[existingAnswerIndex] = {
            questionId: qid,
            selectedAnswers: isSelected
              ? selectedOptions.filter((id) => id !== oid)
              : [...selectedOptions, oid],
          };
        } else {
          updated = [...prev, { questionId: qid, selectedAnswers: [oid] }];
        }
      }

      // Save to localStorage for in-progress attempts
      if (!isCompleted) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (error) {
          console.error("Error saving answers to localStorage:", error);
        }
      }

      return updated;
    });
  };

  const handleQuizSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/final-quiz-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizid: quizId,
          selectedAnswersArray: userAnswers,
          attemptId: attemptId,
        }),
      });
      const data = await response.json();
      if (data.type === "survey") {
        setSurveyReport(data.report);
      } else {
        setQuizResults(data);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionResult = (questionId) => {
    if (!quizResults?.questionResults) return null;
    return quizResults.questionResults.find((r) => r.questionId === questionId);
  };

  const getOptionText = (optionId) => {
    if (!questions) return optionId;
    for (const question of questions) {
      const option = question.options?.find((opt) => opt.id === optionId);
      if (option) return option.text;
    }
    return optionId;
  };

  if (loading) {
    return <Loader loadingMessage="Loading quiz..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 pt-20 md:pt-24 pb-4 sm:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.push("/quiz")}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-3 sm:mb-4 text-xs sm:text-sm font-medium group"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Back to Quizzes</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {assessmentData?.title}
            </h1>
            {assessmentData?.subtitle && (
              <p className="text-sm sm:text-base text-gray-600 mb-2">
                {assessmentData.subtitle}
              </p>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                <span>Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Survey Legend - Show before questions */}
        {assessmentData?.type === "survey" &&
          assessmentData?.legend &&
          !isCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                Response Scale
              </h2>
              <div className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                {assessmentData.legend}
              </div>
            </div>
          )}

        {/* Instructions */}
        {assessmentData?.instructions && !isCompleted && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              Instructions
            </h2>
            <div className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
              {assessmentData.instructions}
            </div>
          </div>
        )}

        {/* Score Card for Completed Quiz Attempts */}
        {isCompleted && quizResults && !isSurvey && (
          <ScoreCard results={quizResults} />
        )}

        {/* Survey Report for Completed Survey Attempts */}
        {isCompleted && surveyReport && isSurvey && (
          <SurveyReportCard report={surveyReport} />
        )}

        {/* Survey Scoring Info and Trends - Show after completion */}
        {isCompleted && assessmentData?.type === "survey" && (
          <>
            {assessmentData?.scoringInfo && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                  Scoring Instructions
                </h2>
                <div className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                  {assessmentData.scoringInfo}
                </div>
              </div>
            )}

            {assessmentData?.trends && (
              <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                  Trends & Interpretation
                </h2>
                <div className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                  {assessmentData.trends}
                </div>
              </div>
            )}
          </>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {questions?.length > 0 &&
            questions.map((question, index) => {
              const questionResult = getQuestionResult(question.id);
              return (
                <QuestionCard
                  key={question.id || index}
                  question={question}
                  index={index}
                  userAnswers={userAnswers}
                  onAnswerChange={handleAnswerChange}
                  isCompleted={isCompleted}
                  questionResult={questionResult}
                  getOptionText={getOptionText}
                />
              );
            })}
        </div>

        {/* Submit Button */}
        {!isCompleted && (
          <div className="mt-6 sm:mt-8 flex justify-end">
            <button
              onClick={handleQuizSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base font-medium shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Submitting...</span>
                  <span className="sm:hidden">Submitting</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Submit Quiz</span>
                  <span className="sm:hidden">Submit</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
