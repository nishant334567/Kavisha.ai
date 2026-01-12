"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import AttemptCard from "@/app/components/admin/AttemptCard";
import { ArrowLeft, Users, BookOpen } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Quiz Attempts
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {quiz?.title || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        {/* Attempts by User */}
        {attemptsByUser.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              No attempts yet
            </p>
            <p className="text-gray-400 text-sm">
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
                  {userGroup.user.image ? (
                    <img
                      src={userGroup.user.image}
                      alt={userGroup.user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-semibold text-sm">
                        {userGroup.user.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {userGroup.user.name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-gray-600">{userGroup.user.email}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {userGroup.attempts.length}{" "}
                    {userGroup.attempts.length === 1 ? "attempt" : "attempts"}
                  </div>
                </div>

                {/* Attempt Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  {userGroup.attempts.map((attempt) => (
                    <AttemptCard key={attempt.id} attempt={attempt} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
