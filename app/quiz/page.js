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
    <div className="min-h-screen bg-background pt-20 pb-8 text-foreground md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="group mb-4 flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-highlight sm:mb-6 sm:text-sm"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-highlight">
              Quizzes and Surveys
            </h1>
          </div>
          {/* <p className="text-sm text-gray-600">
            Manage your quizzes and surveys
          </p> */}
        </div>

        {/* Quiz Cards Grid */}
        {quizzes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center shadow-sm">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted" />
            <p className="mb-2 text-lg font-medium text-foreground">
              No quizzes available yet.
            </p>
            <p className="text-sm text-muted">
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
