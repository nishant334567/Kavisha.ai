"use client";
import { Trophy, CheckCircle2, Target } from "lucide-react";

export default function ScoreCard({ results }) {
  if (!results) return null;

  const percentage = parseFloat(results.percentage);
  const getScoreColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = () => {
    if (percentage >= 80) return "bg-green-50 border-green-200";
    if (percentage >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div
      className={`rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 ${getScoreBgColor()} shadow-sm`}
    >
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
          <Trophy className={`w-5 h-5 sm:w-6 sm:h-6 ${getScoreColor()}`} />
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 font-fredoka">
            Quiz Results
          </h2>
        </div>
        <div className={`text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 font-fredoka ${getScoreColor()}`}>
          {results.score} / {results.totalMarks}
        </div>
        <div className={`text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 font-fredoka ${getScoreColor()}`}>
          {results.percentage}%
        </div>
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 font-fredoka">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            <span>
              {results.correctCount} out of {results.totalQuestions} correct
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
