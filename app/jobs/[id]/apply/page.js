"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ArrowLeft, FileText, ExternalLink, Send, Upload, FileCheck } from "lucide-react";

/**
 * Apply for a job — lives under /jobs/[id]/apply (same APIs as before: /api/job-apply/*).
 */
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

  const jobId = params?.id;

  const applicationPageHref = jobId
    ? brand
      ? `/jobs/${jobId}/application?brand=${encodeURIComponent(brand)}`
      : `/jobs/${jobId}/application`
    : "/jobs";

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      try {
        const url = brand
          ? `/api/jobs/${jobId}?brand=${encodeURIComponent(brand)}`
          : `/api/jobs/${jobId}`;
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
  }, [brand, jobId]);

  useEffect(() => {
    if (!user || !jobId) {
      setAppliedCheckDone(true);
      if (!user) setAlreadyApplied(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/job-apply/applied-ids", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        const jobIds = res.ok && Array.isArray(data.jobIds) ? data.jobIds : [];
        setAlreadyApplied(jobIds.includes(String(jobId)));
      } catch {
        setAlreadyApplied(false);
      } finally {
        setAppliedCheckDone(true);
      }
    })();
  }, [user, jobId]);

  useEffect(() => {
    if (!appliedCheckDone || !alreadyApplied || !jobId) {
      setApplicationData(null);
      return;
    }
    setApplicationLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/job-apply/${jobId}/application`, {
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
  }, [appliedCheckDone, alreadyApplied, jobId]);

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
    const allAnswered =
      questions.length === 0 || answers.every((a, i) => String(answers[i] ?? "").trim() !== "");
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
      if (user.name) formData.append("applicantName", String(user.name).trim());
      if (user.image) formData.append("applicantImage", String(user.image).trim());
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

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-6 text-highlight">Loading…</div>;
  if (!job) return <div className="mx-auto max-w-5xl px-4 py-6 text-muted">Job not found.</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl bg-background px-4 py-6 text-foreground">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted">Apply for job</span>
        </div>
        <div className="rounded-xl border border-amber-300/60 bg-amber-500/10 p-6 text-center">
          <p className="text-amber-800 font-medium">Please log in to apply for this job.</p>
          <p className="text-sm text-amber-700 mt-2">Use the avatar or sign-in option to log in with your email.</p>
        </div>
      </div>
    );
  }

  if (appliedCheckDone && alreadyApplied) {
    const app = applicationData;
    return (
      <div className="mx-auto max-w-5xl bg-background px-4 py-6 text-foreground">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted">Your application</span>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold leading-tight text-highlight">{job.title}</h1>
          <p className="text-sm text-muted">You have already applied for this job.</p>
          <Link
            href={applicationPageHref}
            className="mt-4 inline-flex text-sm font-medium text-highlight hover:underline"
          >
            View full application →
          </Link>
        </div>

        {applicationLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted shadow-sm">
            Loading your application…
          </div>
        ) : app ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileCheck className="w-5 h-5 text-highlight" /> Your application
              </h2>

              {app.resumeLink && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Resume</h3>
                  <a
                    href={app.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-highlight hover:underline"
                  >
                    <FileText className="w-4 h-4" /> View / download resume
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {Array.isArray(app.questionsAnswers) && app.questionsAnswers.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Questions & answers</h3>
                  <ul className="space-y-4">
                    {app.questionsAnswers.map((qa, i) => (
                      <li key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <p className="mb-1 text-sm font-medium text-foreground">{qa.question}</p>
                        <p className="whitespace-pre-wrap text-sm text-muted">{qa.answer || "—"}</p>
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
            <Link
              href={applicationPageHref}
              className="mt-3 inline-flex text-sm font-medium text-highlight hover:underline"
            >
              View application page →
            </Link>
          </div>
        )}
      </div>
    );
  }

  const questions = Array.isArray(job.questions) ? job.questions : [];

  return (
      <div className="mx-auto max-w-5xl bg-background px-4 py-6 text-foreground">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-muted">Apply for job</span>
      </div>

      {error ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold leading-tight text-highlight">
          {job.title}
        </h1>
        {job.description ? (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {job.description}
          </p>
        ) : null}
        {job.jdLink && (
          <a
            href={job.jdLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-highlight hover:underline"
          >
            <FileText className="w-4 h-4 shrink-0" /> Open JD document <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Questions</h2>
            {questions.length === 0 ? (
              <p className="text-sm text-muted">No questions for this job.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i}>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {i + 1}. {q}
                    </label>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswer(i, e.target.value)}
                      rows={3}
                      className="w-full rounded-none border-0 border-b border-border bg-transparent px-0 py-2 text-sm text-foreground placeholder:text-muted focus:border-b-highlight focus:outline-none focus:ring-0 focus:border-b-2"
                      placeholder="Your answer"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-72 flex-shrink-0">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Application</h2>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-highlight px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Submit application
            </button>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Upload resume</label>
              <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-highlight hover:bg-muted-bg">
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-highlight px-4 py-3 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg"
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
