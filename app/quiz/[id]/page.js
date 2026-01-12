"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";

export default function Quiz() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id;

  useEffect(() => {
    const createAttemptAndRedirect = async () => {
      try {
        const response = await fetch(`/api/quiz/start-attempt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assessmentId: quizId,
          }),
        });
        const data = await response.json();
        if (data.attemptId) {
          router.push(`/quiz/${quizId}/${data.attemptId}`);
        }
      } catch (error) {
        console.error("Error creating attempt:", error);
        router.push("/quiz");
      }
    };
    createAttemptAndRedirect();
  }, [quizId, router]);

  return <Loader loadingMessage="Starting quiz..." />;

  // Helper function to check if an option is selected
  const isOptionSelected = (questionId, optionId) => {
    const answer = userAnswers.find((ans) => ans.questionId === questionId);
    return answer ? answer.selectedAnswers.includes(optionId) : false;
  };

  const handleAnswerChange = (qid, oid, qtype) => {
    setUserAnswers((prev) => {
      const existingAnswerIndex = prev.findIndex(
        (ans) => ans.questionId === qid
      );

      if (qtype === "single_choice") {
        if (existingAnswerIndex >= 0) {
          const updated = [...prev];
          updated[existingAnswerIndex] = {
            questionId: qid,
            selectedAnswers: [oid],
          };
          return updated;
        } else {
          return [...prev, { questionId: qid, selectedAnswers: [oid] }];
        }
      } else {
        // Multi-choice
        if (existingAnswerIndex >= 0) {
          const updated = [...prev];
          const selectedOptions = updated[existingAnswerIndex].selectedAnswers;
          const isSelected = selectedOptions.includes(oid);

          updated[existingAnswerIndex] = {
            questionId: qid,
            selectedAnswers: isSelected
              ? selectedOptions.filter((id) => id !== oid)
              : [...selectedOptions, oid],
          };
          return updated;
        } else {
          return [...prev, { questionId: qid, selectedAnswers: [oid] }];
        }
      }
    });
  };

  const handleQuizSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/final-quiz-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizid: quizid,
          selectedAnswersArray: userAnswers,
          attemptId: attemptId,
        }),
      });
      const data = await response.json();
      setQuizResults(data);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // Show results if available
  if (quizResults) {
    return (
      <div className="mt-16 max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Quiz Results
          </h1>

          {/* Score Summary */}
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 mb-2">
                {quizResults.score} / {quizResults.totalMarks}
              </p>
              <p className="text-lg text-gray-600 mb-1">
                {quizResults.percentage}%
              </p>
              <p className="text-sm text-gray-500">
                {quizResults.correctCount} out of {quizResults.totalQuestions}{" "}
                questions correct
              </p>
            </div>
          </div>

          {/* Question Results */}
          <div className="space-y-4">
            {quizResults.questionResults?.map((result, index) => (
              <div
                key={result.questionId}
                className={`border rounded-lg p-4 ${
                  result.isCorrect
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900">
                    Question {index + 1}: {result.questionText}
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      result.isCorrect
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {result.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Your Answer:</strong>{" "}
                    {result.userAnswer.length > 0
                      ? result.userAnswer.join(", ")
                      : "Not answered"}
                  </p>
                  <p>
                    <strong>Correct Answer:</strong>{" "}
                    {result.correctAnswer.join(", ")}
                  </p>
                  <p className="mt-1">
                    <strong>Marks:</strong> {result.marksObtained} /{" "}
                    {result.maxMarks}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-16 max-w-4xl mx-auto px-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {assessmentData?.title}
          </h1>
        </div>
        <div>
          {questions?.length > 0 &&
            questions.map((question, index) => {
              return (
                <div
                  key={index}
                  className="mb-6 p-4 border border-gray-200 rounded-lg bg-white"
                >
                  <p className="font-medium text-gray-900 mb-3">
                    {question?.questionText}
                  </p>
                  <div className="space-y-2">
                    {question?.options?.map((option, optIndex) => {
                      return (
                        <div
                          key={optIndex}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                        >
                          <input
                            type={
                              question?.questionType === "single_choice"
                                ? "radio"
                                : "checkbox"
                            }
                            name={`question-${question.id}`}
                            id={`question-${index}-option-${optIndex}`}
                            value={option?.id}
                            checked={isOptionSelected(question.id, option.id)}
                            onChange={(e) => {
                              handleAnswerChange(
                                question.id,
                                option.id,
                                question.questionType
                              );
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <label
                            htmlFor={`question-${index}-option-${optIndex}`}
                            className="flex-1 cursor-pointer text-gray-700"
                          >
                            {option?.text}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleQuizSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      </div>
    </>
  );
}
