"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import { BookOpen, ArrowLeft, Users } from "lucide-react";

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
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => router.push(`/admin/quiz/${quiz.id}/attempts`)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
              >
                {/* Title and Type Tag */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-fredoka text-lg font-semibold text-[#264653] flex-1 pr-2">
                    {quiz.title || "Quiz title"}
                  </h3>
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

                {/* Subtitle */}
                {quiz.subtitle && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 font-fredoka">
                    {quiz.subtitle}
                  </p>
                )}

                {/* Details */}
                <div className="space-y-1.5 mb-4">
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

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/quiz/${quiz.id}/attempts`);
                    }}
                    className="shadow-sm flex-1 px-4 py-2.5 text-sm font-medium text-[#264653] bg-[#F2FFFF] rounded-full font-fredoka flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Attempts
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/quiz/${quiz.id}`);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#264653] rounded-full font-fredoka"
                  >
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
