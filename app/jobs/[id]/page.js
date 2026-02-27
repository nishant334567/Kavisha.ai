"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Link from "next/link";
import { ArrowLeft, FileText, ExternalLink, Send, FileCheck } from "lucide-react";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const brand = useBrandContext()?.subdomain;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      try {
        const url = brand
          ? `/api/jobs/${params.id}?brand=${encodeURIComponent(brand)}`
          : `/api/jobs/${params.id}`;
        const res = await fetch(url);
        const data = await res.json();
        setJob(res.ok ? data.job ?? null : null);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand, params?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/job-apply/applied-ids", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        const jobIds = res.ok && Array.isArray(data.jobIds) ? data.jobIds : [];
        setAlreadyApplied(jobIds.includes(String(params?.id)));
      } catch {
        setAlreadyApplied(false);
      }
    })();
  }, [params?.id]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-6 text-[#004A4E]">Loading…</div>;
  if (!job) return <div className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Job not found.</div>;

  const hasQuestions = Array.isArray(job.questions) && job.questions.length > 0;

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
        <span className="text-sm text-gray-500">Job details</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-[#004A4E] leading-tight">
            {job.title}
          </h1>

          {job.description ? (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>
          ) : null}

          {hasQuestions && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                Questions ({job.questions.length})
              </h2>
              <ul className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                {job.questions.map((q, i) => (
                  <li key={i} className="leading-relaxed">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.jdLink && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Job description document</h2>
              <a
                href={job.jdLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
              >
                <FileText className="w-4 h-4 shrink-0" /> Open JD document <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3">
          {job.jdLink && (
            <a
              href={job.jdLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#004A4E] text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5 transition-colors"
            >
              <FileText className="w-4 h-4" /> View JD
            </a>
          )}
          {alreadyApplied ? (
            <Link
              href={brand ? `/jobs/${job._id}/application?brand=${encodeURIComponent(brand)}` : `/jobs/${job._id}/application`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <FileCheck className="w-4 h-4" /> View your application
            </Link>
          ) : (
            <Link
              href={`/job-apply/${job._id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" /> Apply
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
