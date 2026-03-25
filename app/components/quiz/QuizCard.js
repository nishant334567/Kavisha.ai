"use client";
import { useRouter } from "next/navigation";
import { BookOpen, Play } from "lucide-react";

export default function QuizCard({ quiz, onViewAttempts }) {
  const router = useRouter();

  const handleStartAttempt = async (e) => {
    e.stopPropagation(); // Prevent card click
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

  const handleCardClick = () => {
    router.push(`/quiz/${quiz.id}`);
  };

  // Format date: "12 Jan '26"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex h-full cursor-pointer flex-col rounded-lg border border-border bg-card p-6 text-foreground transition-all hover:shadow-md"
    >
      {/* Content Section - flex-1 to push buttons down */}
      <div className="flex-1">
        {/* Title and Type Tag */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="flex-1 pr-2 text-lg font-semibold text-highlight">
            {quiz.title || "Quiz title"}
          </h3>
          <span
            className={`px-2.5 py-1 text-xs font-normal rounded-full whitespace-nowrap ${quiz.type === "quiz"
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
              }`}
          >
            {quiz.type === "quiz" ? "Quiz" : "Survey"}
          </span>
        </div>

        {/* Subtitle */}
        {quiz.subtitle && (
          <p className="mb-4 line-clamp-2 text-sm text-muted">
            {quiz.subtitle}
          </p>
        )}

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          <div className="text-sm text-muted">
            {quiz.questionCount || 0} questions
          </div>
          {quiz.createdAt && (
            <div className="text-sm text-muted">
              Created: {formatDate(quiz.createdAt)}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Stuck to bottom */}
      <div className="flex gap-2 mt-auto pt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewAttempts();
          }}
          className="flex-1 rounded-full bg-muted-bg px-4 py-2.5 text-sm font-medium text-highlight shadow-md transition-colors hover:bg-background"
        >
          View Attempts
        </button>
        <button
          onClick={handleStartAttempt}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-highlight px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        >
          <Play className="w-4 h-4" />
          Start
        </button>
      </div>
    </div>
  );
}
