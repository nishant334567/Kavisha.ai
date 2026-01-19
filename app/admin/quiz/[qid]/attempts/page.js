"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { ArrowLeft, Users } from "lucide-react";

export default function QuizAttemptsPage() {
  const params = useParams();
  const router = useRouter();
  const qid = params.qid;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [attemptsByUser, setAttemptsByUser] = useState([]);

  useEffect(() => {
    if (!qid) return;
    fetchAttempts();
  }, [qid]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quiz/${qid}/attempts`);
      const data = await response.json();

      if (response.ok) {
        setQuiz(data.quiz);
        setAttemptsByUser(data.attemptsByUser || []);
      } else {
        alert(data.error || "Failed to fetch attempts");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching attempts:", error);
      alert("Failed to fetch attempts");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading attempts..." />;
  }

  // Format date: "14 Jan '26, 4:07 pm"
  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    const time = date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${day} ${month} '${year}, ${time.toLowerCase()}`;
  };

  // Format time taken: "1m 6s" (expects seconds as number from API)
  const formatTimeTaken = (seconds) => {
    if (seconds == null || (seconds !== 0 && !seconds)) return "NA";
    const n = Number(seconds);
    if (isNaN(n) || n < 0) return "NA";
    const mins = Math.floor(n / 60);
    const secs = Math.floor(n % 60);
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-[#264653] font-fredoka mb-2">
              Quiz attempts
            </h1>
            <p className="text-sm text-[#264653] font-fredoka">
              {quiz?.title || "Loading..."}
            </p>
          </div>
        </div>

        {/* Attempts by User */}
        {attemptsByUser.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2 font-fredoka">
              No attempts yet
            </p>
            <p className="text-gray-400 text-sm font-fredoka">
              Users haven't attempted this quiz yet
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {attemptsByUser.map((userGroup) => (
              <div
                key={userGroup.user.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                {/* User Header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-sm font-fredoka">
                      {userGroup.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#264653] font-fredoka">
                      {userGroup.user.name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-gray-600 font-fredoka">
                      {userGroup.user.email}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 font-fredoka">
                    {userGroup.attempts.length}{" "}
                    {userGroup.attempts.length === 1 ? "Attempt" : "Attempts"}
                  </div>
                </div>

                {/* Attempt Cards */}
                <div className="space-y-3">
                  {userGroup.attempts.map((attempt) => {
                    const isCompleted = attempt.status === "completed";
                    const isInProgress = attempt.status === "in-progress";

                    return (
                      <div
                        key={attempt.id}
                        onClick={
                          isCompleted
                            ? () => router.push(`/quiz/${qid}/${attempt.id}`)
                            : undefined
                        }
                        className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${
                          isCompleted
                            ? "border-green-300 bg-green-50 cursor-pointer hover:bg-green-100/80 transition-colors"
                            : isInProgress
                              ? "border-yellow-300 bg-yellow-50 cursor-default"
                              : "border-gray-200 bg-gray-50 cursor-default"
                        }`}
                      >
                        {/* Col 1: Quiz Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 font-fredoka">
                            {quiz?.title || "Quiz title"}
                          </p>
                        </div>

                        {/* Col 2: Started, Completed, Time taken (below) */}
                        <div className="flex-1 min-w-0 text-sm text-gray-600 font-fredoka space-y-0.5">
                          <div>Started: {formatDateTime(attempt.startedAt)}</div>
                          {attempt.completedAt && (
                            <div>Completed: {formatDateTime(attempt.completedAt)}</div>
                          )}
                          {isCompleted && (
                            <div className="whitespace-nowrap">
                              Time taken: {formatTimeTaken(attempt.timeTaken)}
                            </div>
                          )}
                        </div>

                        {/* Col 3: Status */}
                        <div className="flex-shrink-0">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap font-fredoka ${
                              isCompleted
                                ? "bg-green-100 text-green-700"
                                : isInProgress
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {isCompleted
                              ? "Completed"
                              : isInProgress
                                ? "In progress"
                                : attempt.status || "Unknown"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
