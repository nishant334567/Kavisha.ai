"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Loader from "@/app/components/Loader";
import PreviousAttemptsModal from "@/app/components/PreviousAttemptsModal";
import QuizCard from "@/app/components/quiz/QuizCard";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function QuizPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  useEffect(() => {
    if (!brandContext?.subdomain) return;

    const fetchQuizzes = async () => {
      try {
        const response = await fetch(
          `/api/quiz?brand=${brandContext.subdomain}`
        );
        const data = await response.json();
        if (response.ok) {
          setQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 pt-20 md:pt-24 pb-4 sm:pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors mb-4 sm:mb-6 text-xs sm:text-sm font-medium group"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Quizzes & Surveys
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-10 sm:ml-14">
            Test your knowledge and track your progress
          </p>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 px-4">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium">
              No quizzes available yet.
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">
              Check back later for new quizzes and surveys.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onViewAttempts={() => {
                  setSelectedQuizId(quiz.id);
                  setShowAttemptsModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <PreviousAttemptsModal
        isOpen={showAttemptsModal}
        onClose={() => {
          setShowAttemptsModal(false);
          setSelectedQuizId(null);
        }}
        quizId={selectedQuizId}
      />
    </div>
  );
}
