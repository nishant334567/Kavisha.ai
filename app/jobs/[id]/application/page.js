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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }
  if (!job || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Application not found.</p>
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <Link
          href={jobDetailHref}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">
          Your application
        </h1>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 lg:min-w-[60%] space-y-8">
          {/* Job section: collapsible */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setJobSectionOpen((o) => !o)}
              className="w-full px-6 py-4 flex items-center justify-between gap-2 text-left hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">{job.title}</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${jobSectionOpen ? "rotate-180" : ""}`}
              />
            </button>
            {jobSectionOpen && (
              <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                {job.description ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                    {job.description}
                  </p>
                ) : null}
                {job.jdLink ? (
                  <a
                    href={job.jdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {firstName}&apos;s application form
            </h3>
            <div className="space-y-6">
              {questionsAnswers.length === 0 ? (
                <p className="text-sm text-gray-500">No questions answered.</p>
              ) : (
                questionsAnswers.map((qa, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {qa.question || "Question"}
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {qa.answer || "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-80 shrink-0 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="flex gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-lg shrink-0 overflow-hidden">
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
                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 font-medium">Name</dt>
                <dd className="text-gray-900 mt-0.5">{name}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Email</dt>
                <dd className="text-gray-900 mt-0.5 break-all">{email}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Status</dt>
                <dd className="text-gray-900 mt-0.5">{statusLabel}</dd>
              </div>
              <div>
                <dt className="text-gray-500 font-medium">Resume</dt>
                <dd className="mt-0.5">
                  {application.resumeLink ? (
                    <a
                      href={application.resumeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#004A4E] font-medium hover:underline"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      View resume
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {summary ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Summary</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
