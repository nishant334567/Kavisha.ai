"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import ScoreCard from "@/app/components/quiz/ScoreCard";
import SurveyReportCard from "@/app/components/quiz/SurveyReportCard";
import QuestionCard from "@/app/components/quiz/QuestionCard";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AdminQuizAttemptView() {
  const router = useRouter();
  const params = useParams();
  const qid = params.qid;
  const attemptId = params.attemptId;

  const [assessmentData, setAssessmentData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizResults, setQuizResults] = useState(null);
  const [surveyReport, setSurveyReport] = useState(null);
  const [attemptStatus, setAttemptStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSurvey, setIsSurvey] = useState(false);

  useEffect(() => {
    if (!qid || !attemptId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [quizRes, attemptRes] = await Promise.all([
          fetch(`/api/admin/quiz/${qid}`),
          fetch(`/api/quiz/attempt/${attemptId}`),
        ]);

        const quizData = await quizRes.json();
        const attemptData = await attemptRes.json();

        if (!quizRes.ok) {
          alert(quizData.error || "Failed to load quiz");
          router.push(`/admin/quiz/${qid}/attempts`);
          return;
        }
        if (!attemptRes.ok) {
          alert(attemptData.error || "Failed to load attempt");
          router.push(`/admin/quiz/${qid}/attempts`);
          return;
        }

        const assessment = quizData.assessment;
        const attempt = attemptData.attempt;

        setAssessmentData({
          title: assessment.title,
          subtitle: assessment.subtitle,
          type: assessment.type,
          legend: assessment.legend,
          instructions: assessment.instructions,
          scoringInfo: assessment.scoringInfo,
          trends: assessment.trends,
        });
        setQuestions(quizData.questions || []);
        setIsSurvey(assessment.type === "survey");
        setAttemptStatus(attempt.status);

        if (attempt.status === "completed") {
          if (attempt.surveyResponse && quizData.questions) {
            const surveyAnswers = attempt.surveyResponse.map((item) => {
              const question = (quizData.questions || []).find(
                (q) => q.id === item.questionId?.toString()
              );
              if (question) {
                const selectedOptionIds = (item.selectedAnswers || [])
                  .map((answerText) => {
                    const option = question.options?.find(
                      (opt) => opt.text === answerText
                    );
                    return option?.id;
                  })
                  .filter(Boolean);
                return {
                  questionId: item.questionId?.toString(),
                  selectedAnswers: selectedOptionIds,
                };
              }
              return {
                questionId: item.questionId?.toString(),
                selectedAnswers: [],
              };
            });
            setUserAnswers(surveyAnswers);
          } else if (attemptData.userAnswers?.length > 0) {
            setUserAnswers(attemptData.userAnswers);
          }

          if (attempt.report) {
            if (attempt.report.llmAnalysis) {
              setSurveyReport(attempt.report);
            } else {
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
        }
      } catch (error) {
        console.error("Error fetching attempt:", error);
        alert("Failed to load attempt");
        router.push(`/admin/quiz/${qid}/attempts`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [qid, attemptId, router]);

  const getQuestionResult = (questionId) => {
    if (!quizResults?.questionResults) return null;
    return quizResults.questionResults.find((r) => r.questionId === questionId);
  };

  const getOptionText = (optionId) => {
    if (!questions?.length) return optionId;
    for (const question of questions) {
      const option = question.options?.find((opt) => opt.id === optionId);
      if (option) return option.text;
    }
    return optionId;
  };

  if (loading) {
    return <Loader loadingMessage="Loading attempt..." />;
  }

  const isCompleted = attemptStatus === "completed";

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back - always to admin attempts list */}
        <button
          onClick={() => router.push(`/admin/quiz/${qid}/attempts`)}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to attempts
        </button>

        {!isCompleted ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-800 font-medium font-fredoka">
              This attempt is still in progress.
            </p>
            <p className="text-sm text-amber-700 mt-1 font-fredoka">
              Results will appear here when the user completes it.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#264653] mb-2 font-fredoka">
                {assessmentData?.title}
              </h1>
              {assessmentData?.subtitle && (
                <p className="text-sm text-gray-500 font-fredoka">
                  {assessmentData.subtitle}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 font-fredoka">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Completed</span>
                <span className="text-gray-400">·</span>
                <span>Admin view</span>
              </div>
            </div>

            {quizResults && !isSurvey && (
              <ScoreCard results={quizResults} />
            )}

            {surveyReport && isSurvey && (
              <SurveyReportCard report={surveyReport} />
            )}

            {isSurvey && assessmentData && (
              <>
                {assessmentData.scoringInfo && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 sm:p-6 mb-6">
                    <h2 className="text-lg font-semibold text-[#264653] mb-3 font-fredoka">
                      Scoring Instructions
                    </h2>
                    <div className="text-sm text-gray-700 whitespace-pre-line font-fredoka">
                      {assessmentData.scoringInfo}
                    </div>
                  </div>
                )}
                {assessmentData.trends && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 mb-6">
                    <h2 className="text-lg font-semibold text-[#264653] mb-3 font-fredoka">
                      Trends & Interpretation
                    </h2>
                    <div className="text-sm text-gray-700 whitespace-pre-line font-fredoka">
                      {assessmentData.trends}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-4 mt-6">
              {questions.map((question, index) => (
                <QuestionCard
                  key={question.id || index}
                  question={question}
                  index={index}
                  userAnswers={userAnswers}
                  onAnswerChange={() => {}}
                  isCompleted={true}
                  questionResult={getQuestionResult(question.id)}
                  getOptionText={getOptionText}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
