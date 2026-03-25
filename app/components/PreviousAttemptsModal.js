"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Clock, CheckCircle2, Play } from "lucide-react";

export default function PreviousAttemptsModal({ isOpen, onClose, quizId }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && quizId) {
      const fetchAttempts = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/quiz/${quizId}/attempts`);
          const data = await response.json();
          setAttempts(data.attempts || []);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      fetchAttempts();
    }
  }, [isOpen, quizId]);

  if (!isOpen) return null;

  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
        };
      case "in-progress":
        return {
          icon: Clock,
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          border: "border-yellow-200",
        };
      default:
        return {
          icon: Clock,
          bg: "bg-muted-bg",
          text: "text-foreground",
          border: "border-border",
        };
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-xl sm:max-h-[85vh] sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-border bg-muted-bg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-highlight sm:text-xl">
            Previous Attempts
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-card hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-muted">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-highlight"></div>
              <p className="mt-4">Loading attempts...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto mb-4 h-12 w-12 text-muted" />
              <p className="font-medium text-foreground">No attempts found</p>
              <p className="mt-2 text-sm text-muted">
                Start a new quiz to see your attempts here
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {attempts.map((attempt) => {
                const statusConfig = getStatusConfig(attempt.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <div
                    key={attempt.id}
                    className={`border-2 ${statusConfig.border} rounded-lg bg-card p-4 transition-all hover:shadow-md sm:rounded-xl sm:p-5`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div
                          className={`p-1.5 sm:p-2 ${statusConfig.bg} rounded-lg`}
                        >
                          <StatusIcon
                            className={`w-4 h-4 sm:w-5 sm:h-5 ${statusConfig.text}`}
                          />
                        </div>
                        <div>
                          <span
                            className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${statusConfig.bg} ${statusConfig.text}`}
                          >
                            {attempt.status.replace("-", " ")}
                          </span>
                          <div className="mt-1 text-xs text-muted">
                            {new Date(attempt.startedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {attempt.score !== null && (
                        <div className="text-left sm:text-right">
                            <div className="text-xl font-bold text-highlight sm:text-2xl">
                            {attempt.score}
                            {attempt.totalMarks && (
                              <span className="text-base font-normal text-muted sm:text-lg">
                                /{attempt.totalMarks}
                              </span>
                            )}
                          </div>
                          {attempt.correctCount !== null && (
                            <div className="text-xs text-muted">
                              {attempt.correctCount} correct
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {attempt.completedAt && (
                      <div className="mb-3 text-xs text-muted sm:mb-4">
                        Completed:{" "}
                        <span className="hidden sm:inline">
                          {new Date(attempt.completedAt).toLocaleString()}
                        </span>
                        <span className="sm:hidden">
                          {new Date(attempt.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        router.push(`/quiz/${quizId}/${attempt.id}`);
                        onClose();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-highlight px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 sm:px-4 sm:py-2.5 sm:text-base"
                    >
                      {attempt.status === "in-progress" ? (
                        <>
                          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">View Results</span>
                          <span className="sm:hidden">View</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
