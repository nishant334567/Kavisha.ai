"use client";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function AttemptCard({ attempt }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
          label: "Completed",
        };
      case "in-progress":
        return {
          icon: Clock,
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          border: "border-yellow-200",
          label: "In Progress",
        };
      case "abandoned":
        return {
          icon: XCircle,
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-200",
          label: "Abandoned",
        };
      default:
        return {
          icon: AlertCircle,
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
          label: status,
        };
    }
  };

  const statusConfig = getStatusConfig(attempt.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`bg-white border-2 ${statusConfig.border} rounded-lg p-4 hover:shadow-md transition-all`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${statusConfig.bg} rounded-lg`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.text}`} />
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
        </div>
        {attempt.score !== null && attempt.totalMarks && (
          <div className="text-right">
            <div className="text-xl font-bold text-purple-600">
              {attempt.score}
              <span className="text-gray-400 text-base font-normal">
                /{attempt.totalMarks}
              </span>
            </div>
            {attempt.percentage !== null && (
              <div className="text-xs text-gray-600">{attempt.percentage}%</div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {attempt.correctCount !== null && (
          <div className="flex items-center gap-2 text-gray-600">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>{attempt.correctCount} correct answers</span>
          </div>
        )}

        {attempt.timeTaken && (
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-[#004A4E]" />
            <span>Time taken: {attempt.timeTaken}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          <div>Started: {new Date(attempt.startedAt).toLocaleString()}</div>
          {attempt.completedAt && (
            <div>
              Completed: {new Date(attempt.completedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
