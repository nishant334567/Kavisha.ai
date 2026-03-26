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
    <div className="min-h-screen bg-background pt-20 pb-8 text-foreground md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/quiz")}
            className="group mb-6 flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-highlight font-baloo"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to quizzes
          </button>

          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-semibold text-highlight font-baloo">
              Quiz attempts
            </h1>
            <p className="text-sm text-muted font-baloo">
              {quiz?.title || "Loading..."}
            </p>
          </div>
        </div>

        {/* Attempts by User */}
        {attemptsByUser.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted" />
            <p className="mb-2 text-lg font-medium text-foreground font-baloo">
              No attempts yet
            </p>
            <p className="text-sm text-muted font-baloo">
              Users haven't attempted this quiz yet
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {attemptsByUser.map((userGroup) => (
              <div
                key={userGroup.user.id}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                {/* User Header */}
                <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-bg">
                    <span className="text-sm font-semibold text-muted font-baloo">
                      {userGroup.user.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground font-baloo">
                      {userGroup.user.name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-muted font-baloo">
                      {userGroup.user.email}
                    </p>
                  </div>
                  <div className="text-sm text-muted font-baloo">
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
                            ? () => router.push(`/admin/quiz/${qid}/attempts/${attempt.id}`)
                            : undefined
                        }
                        className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                          isCompleted
                            ? "cursor-pointer border-green-500/40 bg-card transition-colors hover:bg-muted-bg"
                            : isInProgress
                              ? "cursor-default border-amber-500/40 bg-card"
                              : "cursor-default border-border bg-card"
                        }`}
                      >
                        {/* Col 1: Quiz Title */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground font-baloo">
                            {quiz?.title || "Quiz title"}
                          </p>
                        </div>

                        {/* Col 2: Started, Completed, Time taken (below) */}
                        <div className="min-w-0 flex-1 space-y-0.5 text-sm text-muted font-baloo">
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
                            className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap font-baloo ${
                              isCompleted
                                ? "bg-green-100 text-green-700"
                                : isInProgress
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-muted-bg text-foreground"
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
