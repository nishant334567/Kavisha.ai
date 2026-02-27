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
          className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-[#004A4E]">Upload Your Job</h1>
      </div>

      {/* Title & Subtitle */}
      <section className="mb-6 p-4 rounded-xl border border-[#004A4E]/20 bg-white">
        <label className="block text-sm font-medium text-[#004A4E] mb-2">
          Job title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Software Engineer"
          className="w-full px-3 py-2 border border-[#004A4E]/30 rounded-lg text-sm focus:ring-2 focus:ring-[#004A4E]/30 focus:border-[#004A4E] outline-none"
        />
        <label className="block text-sm font-medium text-[#004A4E] mt-3 mb-2">Subtitle</label>
        <input
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Short description (optional)"
          className="w-full px-3 py-2 border border-[#004A4E]/30 rounded-lg text-sm focus:ring-2 focus:ring-[#004A4E]/30 focus:border-[#004A4E] outline-none"
        />
      </section>

      {/* JD Upload */}
      <section className="mb-6 p-4 rounded-xl border border-[#004A4E]/20 bg-[#004A4E]/[0.03]">
        <h2 className="text-sm font-medium text-[#004A4E] mb-3">Job description (JD)</h2>
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
            <span className="flex items-center gap-2 text-sm text-gray-700">
              {jdFile.name}
              <button
                type="button"
                onClick={() => setJdFile(null)}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ) : (
            <span className="text-sm text-gray-500">No file chosen</span>
          )}
        </div>
      </section>

      {/* Questions */}
      <section className="mb-6 p-4 rounded-xl border border-[#004A4E]/20 bg-white">
        <h2 className="text-sm font-medium text-[#004A4E] mb-3">Questions</h2>
        <ul className="space-y-2">
          {jobQuestions.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {editing?.index !== index ? (
                <p className="flex-1 min-w-0 text-sm text-gray-700">{item}</p>
              ) : (
                <>
                  <input
                    value={editing?.text ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, text: e.target.value }))}
                    className="flex-1 min-w-0 px-2 py-1.5 border border-[#004A4E]/30 rounded text-sm"
                  />
                  <button type="button" onClick={saveEdit} className="p-1.5 rounded hover:bg-[#004A4E]/10 text-[#004A4E]">
                    <Save className="w-4 h-4" />
                  </button>
                </>
              )}
              {editing?.index !== index && (
                <>
                  <button type="button" onClick={() => setEditing({ index, text: item })} className="p-1.5 rounded hover:bg-[#004A4E]/10 text-[#004A4E]">
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setJobQuestions((prev) => prev.filter((_, i) => i !== index))}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
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
            className="mt-3 text-sm text-[#004A4E] font-medium hover:underline"
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
              className="flex-1 px-2 py-1.5 border border-[#004A4E]/30 rounded text-sm"
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
          className="px-5 py-2.5 rounded-lg border border-[#004A4E]/30 text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
