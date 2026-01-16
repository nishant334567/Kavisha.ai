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
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-gray-200">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
          <h3 className="text-lg sm:text-xl font-semibold text-[#264653] font-fredoka">
            Previous Attempts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#264653]"></div>
              <p className="mt-4 font-fredoka">Loading attempts...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium font-fredoka">No attempts found</p>
              <p className="text-gray-400 text-sm mt-2 font-fredoka">
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
                    className={`bg-white border-2 ${statusConfig.border} rounded-lg sm:rounded-xl p-4 sm:p-5 hover:shadow-md transition-all`}
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
                          <div className="text-xs text-gray-500 mt-1 font-fredoka">
                            {new Date(attempt.startedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {attempt.score !== null && (
                        <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-[#264653] font-fredoka">
                            {attempt.score}
                            {attempt.totalMarks && (
                              <span className="text-gray-400 text-base sm:text-lg font-normal">
                                /{attempt.totalMarks}
                              </span>
                            )}
                          </div>
                          {attempt.correctCount !== null && (
                            <div className="text-xs text-gray-600 font-fredoka">
                              {attempt.correctCount} correct
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {attempt.completedAt && (
                      <div className="text-xs text-gray-500 mb-3 sm:mb-4 font-fredoka">
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
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-[#264653] text-white rounded-full hover:bg-[#1e383e] transition-colors text-sm sm:text-base font-medium flex items-center justify-center gap-2 shadow-sm font-fredoka"
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
