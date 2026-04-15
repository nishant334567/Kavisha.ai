"use client";
import { EditIcon, Save, Trash2, X, ArrowLeft, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

const INITIAL_QUESTIONS = [
  "Current role or background",
  "Role(s) they're interested in",
  "Years of experience",
  "Education (least relevant)",
  "Current salary and expected",
  "Location (current, and relocation / travel flexibility)",
  "Notice period or availability",
  "Work temperament (e.g. structured, or independent)",
  "Work mode preferences: Remote / Hybrid (if applicable)",
];

export default function UploadJob() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [jobQuestions, setJobQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [editing, setEditing] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setJobQuestions(INITIAL_QUESTIONS);
  }, []);

  const saveEdit = () => {
    if (editing == null) return;
    setJobQuestions((prev) =>
      prev.map((q, i) => (i === editing.index ? editing.text : q))
    );
    setEditing(null);
  };

  const postJob = async () => {
    setError("");
    if (jdFile && !title.trim()) {
      setError("Job title is required when uploading a JD.");
      return;
    }
    if (!jdFile) {
      setError("Please choose a JD file to post.");
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("file", jdFile);
      formData.append("brand", brand ?? "");
      formData.append("title", title.trim() || "Untitled Job");
      formData.append("description", subtitle.trim());
      formData.append("questions", JSON.stringify(jobQuestions));

      const res = await fetch("/api/admin/jobs", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post job");
        return;
      }
      router.back();
    } catch (e) {
      setError(e?.message || "Failed to post job");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-[#004A4E]/10"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-highlight">Upload Your Job</h1>
      </div>

      {/* Title & Subtitle */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-sm font-medium text-highlight">
          Job title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Software Engineer"
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <label className="mt-3 mb-2 block text-sm font-medium text-highlight">Subtitle</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Short description (optional)"
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </section>

      {/* JD Upload */}
      <section className="mb-6 rounded-xl border border-border bg-muted-bg p-4">
        <h2 className="mb-3 text-sm font-medium text-highlight">Job description (JD)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Choose file
            </span>
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="sr-only"
              onChange={(e) => setJdFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {jdFile ? (
            <span className="flex items-center gap-2 text-sm text-foreground">
              {jdFile.name}
              <button
                type="button"
                onClick={() => setJdFile(null)}
                className="rounded p-1 text-muted hover:bg-background"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ) : (
            <span className="text-sm text-muted">No file chosen</span>
          )}
        </div>
      </section>

      {/* Questions */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-[#004A4E] mb-3">Questions</h2>
        <ul className="space-y-2">
          {jobQuestions.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {editing?.index !== index ? (
                <p className="min-w-0 flex-1 text-sm text-foreground">{item}</p>
              ) : (
                <>
                  <input
                    value={editing?.text ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, text: e.target.value }))}
                    className="min-w-0 flex-1 rounded border border-border bg-input px-2 py-1.5 text-sm text-foreground"
                  />
                  <button type="button" onClick={saveEdit} className="rounded p-1.5 text-highlight hover:bg-[#004A4E]/10">
                    <Save className="w-4 h-4" />
                  </button>
                </>
              )}
              {editing?.index !== index && (
                <>
                  <button type="button" onClick={() => setEditing({ index, text: item })} className="rounded p-1.5 text-highlight hover:bg-[#004A4E]/10">
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobQuestions((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded p-1.5 text-red-600 hover:bg-muted-bg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {!showNewInput ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-highlight hover:underline"
            onClick={() => setShowNewInput(true)}
          >
            Add New Question +
          </button>
        ) : (
          <div className="flex gap-2 mt-3">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="New question"
              className="flex-1 rounded border border-border bg-input px-2 py-1.5 text-sm text-foreground placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => {
                if (newQuestion.trim()) {
                  setJobQuestions((prev) => [...prev, newQuestion.trim()]);
                  setNewQuestion("");
                  setShowNewInput(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#004A4E] text-white text-sm font-medium"
            >
              Add
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={postJob}
          disabled={posting || !jdFile}
          className="px-5 py-2.5 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {posting ? "Posting…" : "Post Job"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
