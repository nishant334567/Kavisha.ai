"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, FileText, ExternalLink, ChevronDown } from "lucide-react";

function getDisplayName(applicant) {
  const name = applicant?.applicantName?.trim();
  if (name) return name;
  const email = applicant?.applicantEmail ?? "";
  if (!email) return "Applicant";
  const local = email.split("@")[0] || "";
  const fromEmail = local.replace(/[._0-9]+/g, " ").trim() || local;
  return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).toLowerCase();
}

function getInitials(email) {
  if (!email || typeof email !== "string") return "?";
  const local = email.split("@")[0] || "";
  if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
  return local.slice(0, 2).toUpperCase() || "?";
}

export default function MyApplicationPage() {
  const params = useParams();
  const brand = useBrandContext()?.subdomain;
  const jobId = params?.id;

  const [job, setJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobSectionOpen, setJobSectionOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      setLoading(true);
      try {
        const url = brand
          ? `/api/jobs/${jobId}/application?brand=${encodeURIComponent(brand)}`
          : `/api/jobs/${jobId}/application`;
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.job && data.application) {
          setJob(data.job);
          setApplication(data.application);
        } else {
          setJob(null);
          setApplication(null);
        }
      } catch {
        setJob(null);
        setApplication(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand, jobId]);

  const jobDetailHref = brand
    ? `/jobs/${jobId}?brand=${encodeURIComponent(brand)}`
    : `/jobs/${jobId}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }
  if (!job || !application) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted">Application not found.</p>
      </div>
    );
  }

  const name = getDisplayName(application);
  const email = application.applicantEmail ?? "";
  const imageUrl = application.applicantImage?.trim() || "";
  const summary = application.applicationSummary ?? "";
  const initials = getInitials(email);
  const questionsAnswers = Array.isArray(application.questionsAnswers)
    ? application.questionsAnswers
    : [];
  const firstName = name.trim().split(/\s+/)[0] || name;
  const statusLabel = (application.status ?? "").trim() || "—";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <Link
          href={jobDetailHref}
          className="rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="flex-1 truncate text-lg font-bold text-highlight">
          Your application
        </h1>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 lg:min-w-[60%] space-y-8">
          {/* Job section: collapsible */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setJobSectionOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-6 py-4 text-left hover:bg-muted-bg"
            >
              <span className="font-semibold text-foreground">{job.title}</span>
              <ChevronDown
                className={`w-5 h-5 shrink-0 text-muted transition-transform ${jobSectionOpen ? "rotate-180" : ""}`}
              />
            </button>
            {jobSectionOpen && (
              <div className="border-t border-border px-6 pb-6 pt-0">
                {job.description ? (
                  <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {job.description}
                  </p>
                ) : null}
                {job.jdLink ? (
                  <a
                    href={job.jdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-highlight hover:underline"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    View JD
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {/* Application form */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-foreground">
              {firstName}&apos;s application form
            </h3>
            <div className="space-y-6">
              {questionsAnswers.length === 0 ? (
                <p className="text-sm text-muted">No questions answered.</p>
              ) : (
                questionsAnswers.map((qa, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {qa.question || "Question"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {qa.answer || "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-80 shrink-0 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Contact</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted-bg text-lg font-semibold text-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-highlight">{name}</h2>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-muted">Name</dt>
                <dd className="mt-0.5 text-foreground">{name}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Email</dt>
                <dd className="mt-0.5 break-all text-foreground">{email}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Status</dt>
                <dd className="mt-0.5 text-foreground">{statusLabel}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Resume</dt>
                <dd className="mt-0.5">
                  {application.resumeLink ? (
                    <a
                      href={application.resumeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-highlight hover:underline"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      View resume
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {summary ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Summary</h3>
              <p className="text-sm leading-relaxed text-muted">{summary}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
