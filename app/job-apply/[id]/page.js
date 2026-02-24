"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ArrowLeft, FileText, ExternalLink, Send, Upload, FileCheck } from "lucide-react";

export default function JobApplyPage() {
  const router = useRouter();
  const params = useParams();
  const brand = useBrandContext()?.subdomain;
  const { user } = useFirebaseSession();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [appliedCheckDone, setAppliedCheckDone] = useState(false);
  const [applicationData, setApplicationData] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      try {
        const url = brand
          ? `/api/jobs/${params.id}?brand=${encodeURIComponent(brand)}`
          : `/api/jobs/${params.id}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.job) {
          setJob(data.job);
          const qs = data.job.questions || [];
          setAnswers(qs.map(() => ""));
        } else {
          setJob(null);
        }
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand, params?.id]);

  useEffect(() => {
    if (!user || !params?.id) {
      setAppliedCheckDone(true);
      if (!user) setAlreadyApplied(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/job-apply/applied-ids", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        const jobIds = res.ok && Array.isArray(data.jobIds) ? data.jobIds : [];
        setAlreadyApplied(jobIds.includes(String(params.id)));
      } catch {
        setAlreadyApplied(false);
      } finally {
        setAppliedCheckDone(true);
      }
    })();
  }, [user, params?.id]);

  useEffect(() => {
    if (!appliedCheckDone || !alreadyApplied || !params?.id) {
      setApplicationData(null);
      return;
    }
    setApplicationLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/job-apply/${params.id}/application`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.application) {
          setApplicationData(data.application);
        } else {
          setApplicationData(null);
        }
      } catch {
        setApplicationData(null);
      } finally {
        setApplicationLoading(false);
      }
    })();
  }, [appliedCheckDone, alreadyApplied, params?.id]);

  const setAnswer = (index, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!user?.email) {
      setError("Please log in to apply.");
      return;
    }
    const questions = Array.isArray(job.questions) ? job.questions : [];
    const allAnswered = questions.length === 0 || answers.every((a, i) => String(answers[i] ?? "").trim() !== "");
    if (!allAnswered) {
      setError("Please answer all questions.");
      return;
    }
    if (!resumeFile) {
      setError("Please upload your resume.");
      return;
    }
    const email = user.email.trim().toLowerCase();
    setSubmitting(true);
    setError("");
    try {
      const questionsAnswers = questions.map((q, i) => ({
        question: q,
        answer: String(answers[i] ?? "").trim(),
      }));
      const formData = new FormData();
      formData.append("jobId", job._id);
      formData.append("applicantEmail", email);
      formData.append("resume", resumeFile);
      formData.append("questionsAnswers", JSON.stringify(questionsAnswers));
      const res = await fetch("/api/job-apply", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit application.");
        return;
      }
      alert("Application submitted successfully.");
      router.push("/jobs");
    } catch (err) {
      setError(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-6 text-[#004A4E]">Loading…</div>;
  if (!job) return <div className="max-w-5xl mx-auto px-4 py-6 text-gray-500">Job not found.</div>;

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">Apply for job</span>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800 font-medium">Please log in to apply for this job.</p>
          <p className="text-sm text-amber-700 mt-2">Use the avatar or sign-in option to log in with your email.</p>
        </div>
      </div>
    );
  }

  if (appliedCheckDone && alreadyApplied) {
    const app = applicationData;
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">Your application</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#004A4E] leading-tight mb-1">{job.title}</h1>
          <p className="text-sm text-gray-500">You have already applied for this job.</p>
        </div>

        {applicationLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-center text-gray-500">
            Loading your application…
          </div>
        ) : app ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#004A4E]" /> Your application
              </h2>

              {app.resumeLink && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Resume</h3>
                  <a
                    href={app.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#004A4E] font-medium hover:underline"
                  >
                    <FileText className="w-4 h-4" /> View / download resume
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {Array.isArray(app.questionsAnswers) && app.questionsAnswers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Questions & answers</h3>
                  <ul className="space-y-4">
                    {app.questionsAnswers.map((qa, i) => (
                      <li key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-gray-700 mb-1">{qa.question}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{qa.answer || "—"}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-amber-800 font-medium">You have already applied for this job.</p>
          </div>
        )}
      </div>
    );
  }

  const questions = Array.isArray(job.questions) ? job.questions : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-500">Apply for job</span>
      </div>

      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {/* Top: full job info */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#004A4E] leading-tight mb-4">
          {job.title}
        </h1>
        {job.description ? (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-4">
            {job.description}
          </p>
        ) : null}
        {job.jdLink && (
          <a
            href={job.jdLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
          >
            <FileText className="w-4 h-4 shrink-0" /> Open JD document <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Bottom: left = questions, right = actions */}
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        {/* Left: questions with input boxes */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions</h2>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">No questions for this job.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {i + 1}. {q}
                    </label>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswer(i, e.target.value)}
                      rows={3}
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-300 rounded-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-b-[#004A4E] focus:border-b-2"
                      placeholder="Your answer"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: submit, upload resume, view JD */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900">Application</h2>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Submit application
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload resume</label>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium hover:border-[#004A4E] hover:bg-[#004A4E]/5 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                {resumeFile ? resumeFile.name : "Choose file"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {job.jdLink && (
              <a
                href={job.jdLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-[#004A4E] text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5 transition-colors"
              >
                <FileText className="w-4 h-4" /> View JD
              </a>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
