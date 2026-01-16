"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, CheckCircle2 } from "lucide-react";
import Loader from "@/app/components/Loader";

export default function QuizViewEdit() {
  const params = useParams();
  const router = useRouter();
  const qid = params.qid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!qid) return;
    fetchQuizData();
  }, [qid]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quiz/${qid}`);
      const data = await response.json();

      if (response.ok) {
        setAssessment(data.assessment);
        setQuestions(data.questions || []);
        setFormData({
          title: data.assessment.title || "",
          subtitle: data.assessment.subtitle || "",
          objective: data.assessment.objective || "",
          instructions: data.assessment.instructions || "",
          totalMarks: data.assessment.totalMarks || null,
          durationInMinutes: data.assessment.durationInMinutes || null,
          legend: data.assessment.legend || "",
          scoringInfo: data.assessment.scoringInfo || "",
          trends: data.assessment.trends || "",
        });
      } else {
        alert(data.error || "Failed to load quiz");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      alert("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/quiz/${qid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Quiz updated successfully!");
        fetchQuizData();
      } else {
        alert(data.error || "Failed to update quiz");
      }
    } catch (error) {
      console.error("Error updating quiz:", error);
      alert("Failed to update quiz");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this quiz? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/quiz/${qid}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Quiz deleted successfully!");
        router.back();
      } else {
        alert(data.error || "Failed to delete quiz");
      }
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz");
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading quiz..." />;
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Quiz not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 md:pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors mb-6 text-sm font-medium font-fredoka group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold text-[#264653] font-fredoka">
              Quiz Details
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors text-sm font-medium font-fredoka flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#264653] text-white rounded-full hover:bg-[#1e383e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium font-fredoka flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Assessment Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#264653] font-fredoka mb-4">
            Quiz Information
          </h2>

          <div className="space-y-4">
            {/* Type - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Type
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-gray-900 capitalize font-fredoka">
                  {assessment.type}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter quiz title"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter subtitle"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Objective
              </label>
              <textarea
                value={formData.objective || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    objective: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter objective"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Instructions
              </label>
              <textarea
                value={formData.instructions || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instructions: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter instructions"
              />
            </div>

            {/* Total Marks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Total Marks
              </label>
              <input
                type="number"
                value={formData.totalMarks || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    totalMarks: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter total marks"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.durationInMinutes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    durationInMinutes: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                placeholder="Enter duration in minutes"
              />
            </div>

            {/* Survey-specific fields */}
            {assessment.type === "survey" && (
              <>
                {/* Legend */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                    Legend / Response Scale
                  </label>
                  <textarea
                    value={formData.legend || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        legend: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                    placeholder="e.g., 1: Completely Disagree, 2: Moderately Disagree..."
                  />
                  <p className="text-xs text-gray-500 mt-1 font-fredoka">
                    Describe the response scale or legend for your survey
                  </p>
                </div>

                {/* Scoring Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                    Scoring Instructions
                  </label>
                  <textarea
                    value={formData.scoringInfo || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scoringInfo: e.target.value,
                      }))
                    }
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                    placeholder="e.g., Add up your scores for items 1, 2, 4 and 5..."
                  />
                  <p className="text-xs text-gray-500 mt-1 font-fredoka">
                    Provide step-by-step instructions on how to calculate the
                    survey score
                  </p>
                </div>

                {/* Trends */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-fredoka">
                    Trends / Interpretation Guide
                  </label>
                  <textarea
                    value={formData.trends || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        trends: e.target.value,
                      }))
                    }
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-fredoka"
                    placeholder="e.g., If you scored 35 or below, you are in bottom 1/4th..."
                  />
                  <p className="text-xs text-gray-500 mt-1 font-fredoka">
                    Provide interpretation guidelines based on score ranges
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Questions Section - Read Only */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#264653] font-fredoka mb-4">
            Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <p className="text-gray-500 text-center py-8 font-fredoka">
              No questions added yet
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isCorrect = (optionId) => {
                  if (question.questionType === "single_choice") {
                    return question.correctAnswer === optionId;
                  }
                  return (
                    Array.isArray(question.correctAnswer) &&
                    question.correctAnswer.includes(optionId)
                  );
                };

                return (
                  <div
                    key={question.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        Q{index + 1}
                      </span>
                      <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium capitalize">
                        {question.questionType.replace("_", " ")}
                      </span>
                      {question.maxMarks && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {question.maxMarks} marks
                        </span>
                      )}
                    </div>

                    <p className="text-gray-900 font-medium mb-4 font-fredoka">
                      {question.questionText}
                    </p>

                    <div className="space-y-2">
                      {question.options?.map((option) => {
                        const correct = isCorrect(option.id);
                        return (
                          <div
                            key={option.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                              correct
                                ? "bg-green-50 border-green-300"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                correct
                                  ? "border-green-600 bg-green-100"
                                  : "border-gray-300"
                              }`}
                            >
                              {correct && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                            <span
                              className={`flex-1 ${
                                correct
                                  ? "text-green-900 font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {option.text}
                            </span>
                            {correct && (
                              <span className="text-xs text-green-600 font-semibold">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
