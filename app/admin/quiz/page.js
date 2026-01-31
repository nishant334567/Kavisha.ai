"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import { BookOpen, ArrowLeft, Users, Trash2, Upload } from "lucide-react";

export default function AdminQuizList() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const handleDelete = async (e, quiz) => {
    e.stopPropagation();
    if (!confirm(`Delete "${quiz.title || "this quiz"}"? This cannot be undone.`)) return;
    try {
      setDeletingId(quiz.id);
      const response = await fetch(`/api/admin/quiz/${quiz.id}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (e, quiz) => {
    e.stopPropagation();
    const questionCount = quiz.questionCount ?? 0;
    if (questionCount < 1) {
      alert("Add at least one question before publishing. Open Edit draft to add questions.");
      return;
    }
    try {
      setPublishingId(quiz.id);
      const response = await fetch(`/api/admin/quiz/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment: { status: "published" } }),
      });
      const data = await response.json();
      if (response.ok) {
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quiz.id ? { ...q, status: "published" } : q))
        );
      } else {
        alert(data.error || "Failed to publish. Add at least one question in Edit draft.");
      }
    } catch (err) {
      console.error("Error publishing:", err);
      alert("Failed to publish");
    } finally {
      setPublishingId(null);
    }
  };

  useEffect(() => {
    if (!brandContext?.subdomain) return;

    const fetchQuizzes = async () => {
      try {
        const response = await fetch(
          `/api/admin/quiz?brand=${brandContext.subdomain}`
        );
        const data = await response.json();
        if (response.ok) {
          setQuizzes(data.quizzes || []);
        } else {
          alert(data.error || "Failed to fetch quizzes");
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        alert("Failed to fetch quizzes");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [brandContext]);

  // Format date: "12 Jan '26"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  if (loading) {
    return <Loader loadingMessage="Loading quizzes..." />;
  }

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-teal-800 font-fredoka">
              My quizzes and surveys
            </h1>
          </div>
          <p className="text-sm text-gray-600 font-fredoka">
            Manage your quizzes and surveys
          </p>
        </div>

        {/* Action Bar: Add New */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-end">
          {/* Add New Button */}
          <button
            onClick={() => router.push("/admin/quiz/new")}
            className="px-4 py-2.5 bg-[#F2FFFF] text-[#00585C] rounded-full text-sm font-medium font-fredoka whitespace-nowrap"
          >
            + Add new
          </button>
        </div>

        {/* Quiz Cards Grid */}
        {quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2 font-fredoka">
              No quizzes created yet
            </p>
            <p className="text-gray-400 text-sm mb-6 font-fredoka">
              Create your first quiz or survey to get started
            </p>
            <button
              onClick={() => router.push("/admin/quiz/new")}
              className="px-6 py-2.5 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors font-medium font-fredoka"
            >
              Create Quiz
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const isDraft = (quiz.status || "draft") === "draft";
              return (
              <div
                key={quiz.id}
                onClick={() =>
                  isDraft
                    ? router.push(`/admin/quiz/${quiz.id}`)
                    : router.push(`/admin/quiz/${quiz.id}/attempts`)
                }
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
              >
                {/* Content Area - takes available space */}
                <div className="flex-1">
                  {/* Title, Status, Type */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-fredoka text-lg font-semibold text-[#264653] flex-1 pr-2 min-w-0">
                      {quiz.title || "Quiz title"}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full font-fredoka ${
                          isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {isDraft ? "Draft" : "Published"}
                      </span>
                      <span
                        className={`px-2.5 py-1 text-xs font-normal rounded-full whitespace-nowrap font-fredoka ${
                          quiz.type === "quiz"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {quiz.type === "quiz" ? "Quiz" : "Survey"}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle */}
                  {quiz.subtitle && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 font-fredoka">
                      {quiz.subtitle}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5">
                    <div className="text-sm text-gray-600 font-fredoka">
                      {quiz.questionCount || 0} questions
                    </div>
                    {quiz.durationInMinutes && quiz.type === "quiz" && (
                      <div className="text-sm text-gray-600 font-fredoka">
                        Duration: {quiz.durationInMinutes}m
                      </div>
                    )}
                    {quiz.createdAt && (
                      <div className="text-sm text-gray-600 font-fredoka">
                        Created: {formatDate(quiz.createdAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - by status */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                  {isDraft ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/quiz/${quiz.id}`);
                        }}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#264653] rounded-full font-fredoka min-w-0"
                      >
                        Edit draft
                      </button>
                      <button
                        onClick={(e) => handlePublish(e, quiz)}
                        disabled={publishingId === quiz.id || (quiz.questionCount ?? 0) < 1}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full font-fredoka flex items-center justify-center gap-2 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={(quiz.questionCount ?? 0) < 1 ? "Add at least one question to publish" : "Publish"}
                      >
                        <Upload className="w-4 h-4 shrink-0" />
                        {publishingId === quiz.id ? "Publishing..." : "Publish"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/quiz/${quiz.id}/attempts`);
                      }}
                      className="shadow-sm flex-1 px-4 py-2.5 text-sm font-medium text-[#264653] bg-[#F2FFFF] rounded-full font-fredoka flex items-center justify-center gap-2 min-w-0"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      View attempts
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, quiz)}
                    disabled={deletingId === quiz.id}
                    className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full font-fredoka flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    title="Delete quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete quiz
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
