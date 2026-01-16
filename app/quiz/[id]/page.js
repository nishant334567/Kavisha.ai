"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import {
  ArrowLeft,
  Play,
  Clock,
  FileText,
  Award,
  BookOpen,
} from "lucide-react";

export default function QuizInfo() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [quizData, setQuizData] = useState(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/quiz/${quizId}`);
        const data = await response.json();

        if (response.ok) {
          setQuizData({
            quiz: data.quiz,
            questionCount: data.questions?.length || 0,
          });
        } else {
          alert(data.error || "Failed to load quiz");
          router.push("/quiz");
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        alert("Failed to load quiz");
        router.push("/quiz");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuizData();
    }
  }, [quizId, router]);

  const handleStartQuiz = async () => {
    try {
      setStarting(true);
      const response = await fetch(`/api/quiz/start-attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId: quizId,
        }),
      });
      const data = await response.json();
      if (data.attemptId) {
        router.push(`/quiz/${quizId}/${data.attemptId}`);
      } else {
        alert("Failed to start quiz. Please try again.");
        setStarting(false);
      }
    } catch (error) {
      console.error("Error creating attempt:", error);
      alert("Failed to start quiz. Please try again.");
      setStarting(false);
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading quiz..." />;
  }

  if (!quizData) {
    return null;
  }

  const { quiz, questionCount } = quizData;

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/quiz")}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Quizzes
        </button>

        {/* Quiz Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`px-3 py-1 text-sm font-normal rounded-full font-fredoka ${
                quiz.type === "quiz"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {quiz.type === "quiz" ? "Quiz" : "Survey"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#264653] mb-3 font-fredoka">
            {quiz.title}
          </h1>
          {quiz.subtitle && (
            <p className="text-lg text-gray-600 font-fredoka">
              {quiz.subtitle}
            </p>
          )}
        </div>

        {/* Quiz Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-[#264653] mb-6 font-fredoka">
            Quiz Information
          </h2>

          <div className="space-y-4">
            {/* Number of Questions */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-[#264653]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 font-fredoka">Questions</p>
                <p className="text-lg font-semibold text-[#264653] font-fredoka">
                  {questionCount}{" "}
                  {questionCount === 1 ? "question" : "questions"}
                </p>
              </div>
            </div>

            {/* Duration (only for quizzes) */}
            {quiz.type === "quiz" && quiz.durationInMinutes && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Clock className="w-5 h-5 text-[#264653]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-fredoka">Duration</p>
                  <p className="text-lg font-semibold text-[#264653] font-fredoka">
                    {quiz.durationInMinutes}{" "}
                    {quiz.durationInMinutes === 1 ? "minute" : "minutes"}
                  </p>
                </div>
              </div>
            )}

            {/* Total Marks (only for quizzes) */}
            {quiz.type === "quiz" && quiz.totalMarks && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Award className="w-5 h-5 text-[#264653]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-fredoka">
                    Total Marks
                  </p>
                  <p className="text-lg font-semibold text-[#264653] font-fredoka">
                    {quiz.totalMarks} {quiz.totalMarks === 1 ? "mark" : "marks"}
                  </p>
                </div>
              </div>
            )}

            {/* Objective */}
            {quiz.objective && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BookOpen className="w-5 h-5 text-[#264653]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-fredoka mb-2">
                    Objective
                  </p>
                  <p className="text-base text-gray-700 font-fredoka whitespace-pre-line">
                    {quiz.objective}
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {quiz.instructions && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <FileText className="w-5 h-5 text-[#264653]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-fredoka mb-2">
                    Instructions
                  </p>
                  <p className="text-base text-gray-700 font-fredoka whitespace-pre-line">
                    {quiz.instructions}
                  </p>
                </div>
              </div>
            )}

            {/* Survey Legend */}
            {quiz.type === "survey" && quiz.legend && (
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-[#264653]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-fredoka mb-2">
                    Response Scale
                  </p>
                  <p className="text-base text-gray-700 font-fredoka whitespace-pre-line">
                    {quiz.legend}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={handleStartQuiz}
            disabled={starting}
            className="w-full sm:w-auto px-8 py-3 bg-[#264653] text-white rounded-full hover:bg-[#1e383e] disabled:bg-gray-400 disabled:cursor-not-allowed text-base font-medium shadow-sm transition-all flex items-center justify-center gap-2 font-fredoka"
          >
            {starting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start {quiz.type === "quiz" ? "Quiz" : "Survey"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
