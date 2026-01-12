"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import { BookOpen, ArrowLeft, Edit, Users } from "lucide-react";

export default function AdminQuizList() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <Loader loadingMessage="Loading quizzes..." />;
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  My Quizzes & Surveys
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your quizzes and surveys
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin/quiz/new")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              + Add New
            </button>
          </div>
        </div>

        {/* Quiz Cards Grid */}
        {quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              No quizzes created yet
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Create your first quiz or survey to get started
            </p>
            <button
              onClick={() => router.push("/admin/quiz/new")}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Create Quiz
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => router.push(`/admin/quiz/${quiz.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {quiz.title}
                    </h3>
                    {quiz.subtitle && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {quiz.subtitle}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      quiz.type === "quiz"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {quiz.type === "quiz" ? "Quiz" : "Survey"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {quiz.questionCount}{" "}
                      {quiz.questionCount === 1 ? "question" : "questions"}
                    </span>
                  </div>
                  {quiz.totalMarks && (
                    <div className="text-sm text-gray-600">
                      Total Marks: {quiz.totalMarks}
                    </div>
                  )}
                  {quiz.durationInMinutes && (
                    <div className="text-sm text-gray-600">
                      Duration: {quiz.durationInMinutes} min
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Created: {new Date(quiz.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/quiz/${quiz.id}/attempts`);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Attempts
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/quiz/${quiz.id}`);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
