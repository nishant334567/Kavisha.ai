"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, CheckCircle2, Upload, Eye } from "lucide-react";
import Loader from "@/app/components/Loader";
import QuestionsForm from "@/app/admin/components/QuestionsForm";

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
          assessment: { ...formData, status: "draft" },
          questions,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Draft saved.");
        fetchQuizData();
      } else {
        alert(data.error || "Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!questions?.length) {
      alert("Add at least one question before publishing.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/quiz/${qid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment: { ...formData, status: "published" },
          questions,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Quiz/Survey published!");
        fetchQuizData();
      } else {
        alert(data.error || "Failed to publish");
      }
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish");
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
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted">Quiz not found</p>
      </div>
    );
  }

  const isDraft = (assessment.status || "draft") === "draft";

  return (
    <div className="min-h-screen bg-background pt-20 pb-8 text-foreground md:pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="group mb-6 flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-highlight font-fredoka"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>

          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold text-highlight font-fredoka">
                Quiz Details
              </h1>
              <span className={`px-2 py-1 text-sm font-medium rounded-full font-fredoka ${isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                {isDraft ? "Draft" : "Published"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors text-sm font-medium font-fredoka flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete quiz
              </button>
              {isDraft ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 font-fredoka"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save draft"}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={saving || !questions?.length}
                    className="flex items-center gap-2 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 font-fredoka"
                  >
                    <Upload className="w-4 h-4" />
                    {saving ? "Publishing..." : "Publish"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push(`/admin/quiz/${qid}/attempts`)}
                  className="flex items-center gap-2 rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 font-fredoka"
                >
                  <Eye className="w-4 h-4" />
                  View attempts
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Details Card */}
        <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-foreground font-fredoka">
            Quiz Information
          </h2>

          <div className="space-y-4">
            {/* Type - Read Only */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
                Type
              </label>
              <div className="rounded-xl border border-border bg-muted-bg px-3 py-2">
                <span className="capitalize text-foreground font-fredoka">
                  {assessment.type}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                readOnly={!isDraft}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter quiz title"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                readOnly={!isDraft}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter subtitle"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                readOnly={!isDraft}
                rows={3}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter objective"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                readOnly={!isDraft}
                rows={3}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter instructions"
              />
            </div>

            {/* Total Marks */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                readOnly={!isDraft}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter total marks"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                readOnly={!isDraft}
                className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                placeholder="Enter duration in minutes"
              />
            </div>

            {/* Survey-specific fields */}
            {assessment.type === "survey" && (
              <>
                {/* Legend */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                    readOnly={!isDraft}
                    rows={4}
                    className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                    placeholder="e.g., 1: Completely Disagree, 2: Moderately Disagree..."
                  />
                  <p className="mt-1 text-xs text-muted font-fredoka">
                    Describe the response scale or legend for your survey
                  </p>
                </div>

                {/* Scoring Info */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                    readOnly={!isDraft}
                    rows={6}
                    className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                    placeholder="e.g., Add up your scores for items 1, 2, 4 and 5..."
                  />
                  <p className="mt-1 text-xs text-muted font-fredoka">
                    Provide step-by-step instructions on how to calculate the
                    survey score
                  </p>
                </div>

                {/* Trends */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground font-fredoka">
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
                    readOnly={!isDraft}
                    rows={6}
                    className={`w-full rounded-xl border border-border px-4 py-2 font-fredoka ${isDraft ? "bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" : "cursor-default bg-muted-bg text-foreground"}`}
                    placeholder="e.g., If you scored 35 or below, you are in bottom 1/4th..."
                  />
                  <p className="mt-1 text-xs text-muted font-fredoka">
                    Provide interpretation guidelines based on score ranges
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Questions: editable for draft (QuestionsForm + QuestionItem), read-only for published */}
        {isDraft ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <QuestionsForm
              questions={questions}
              onChange={setQuestions}
              isQuiz={assessment.type === "quiz"}
              brand={assessment.brand}
              editMode
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-foreground font-fredoka">
              Questions ({questions.length})
            </h2>
            {questions.length === 0 ? (
              <p className="py-8 text-center text-muted font-fredoka">No questions</p>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const isCorrect = (optionId) => {
                    if (question.questionType === "single_choice")
                      return question.correctAnswer === optionId;
                    return Array.isArray(question.correctAnswer) && question.correctAnswer.includes(optionId);
                  };
                  return (
                    <div key={question.id} className="rounded-lg border border-border bg-muted-bg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Q{index + 1}</span>
                        <span className="rounded bg-card px-2 py-1 text-xs font-medium capitalize text-foreground">
                          {question.questionType.replace("_", " ")}
                        </span>
                        {question.maxMarks && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{question.maxMarks} marks</span>
                        )}
                      </div>
                      <p className="mb-4 font-medium text-foreground font-fredoka">{question.questionText}</p>
                      {question.images && question.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {question.images.map((imageUrl, imgIndex) => (
                            <img key={imgIndex} src={imageUrl} alt={`Q${index + 1} image ${imgIndex + 1}`} className="h-32 w-auto rounded-lg border border-border bg-card object-contain" />
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        {question.options?.map((option) => {
                          const correct = isCorrect(option.id);
                          return (
                            <div key={option.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${correct ? "border-green-300 bg-green-50" : "border-border bg-card"}`}>
                              <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${correct ? "border-green-600 bg-green-100" : "border-border"}`}>
                                {correct && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                              </div>
                              <span className={`flex-1 ${correct ? "font-medium text-green-900" : "text-foreground"}`}>{option.text}</span>
                              {correct && <span className="text-xs text-green-600 font-semibold">Correct</span>}
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
        )}
      </div>
    </div>
  );
}
