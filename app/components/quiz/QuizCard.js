"use client";
import { useRouter } from "next/navigation";
import { BookOpen, Play } from "lucide-react";

export default function QuizCard({ quiz, onViewAttempts }) {
  const router = useRouter();

  const handleStartAttempt = async () => {
    try {
      const response = await fetch(`/api/quiz/start-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: quiz.id }),
      });
      const data = await response.json();
      if (data.attemptId) {
        router.push(`/quiz/${quiz.id}/${data.attemptId}`);
      }
    } catch (error) {
      console.error("Error creating attempt:", error);
      alert("Failed to start quiz. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 hover:border-purple-300">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
            {quiz.title}
          </h3>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              {quiz.questionCount}{" "}
              {quiz.questionCount === 1 ? "question" : "questions"}
            </span>
          </div>
        </div>
        <span
          className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
            quiz.type === "quiz"
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {quiz.type === "quiz" ? "Quiz" : "Survey"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 mt-4">
        <button
          onClick={onViewAttempts}
          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <span className="hidden sm:inline">Previous Attempts</span>
          <span className="sm:hidden">Attempts</span>
        </button>
        <button
          onClick={handleStartAttempt}
          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
          Start
        </button>
      </div>
    </div>
  );
}
