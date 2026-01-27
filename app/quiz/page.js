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
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-4 sm:mb-6 text-xs sm:text-sm font-medium font-fredoka group"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-[#264653] font-fredoka">
              Quizzes and Surveys
            </h1>
          </div>
          {/* <p className="text-sm text-gray-600 font-fredoka">
            Manage your quizzes and surveys
          </p> */}
        </div>

        {/* Quiz Cards Grid */}
        {quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2 font-fredoka">
              No quizzes available yet.
            </p>
            <p className="text-gray-400 text-sm font-fredoka">
              Check back later for new quizzes and surveys.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
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
