"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, FileText, Plus, Users, ExternalLink } from "lucide-react";

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs?brand=${encodeURIComponent(brand)}`, {
          credentials: "include",
        });
        const data = await res.json();
        setJobs(res.ok ? (data.jobs ?? []) : []);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  const jobDetailHref = (jobId) =>
    brand ? `/admin/jobs/${jobId}?subdomain=${encodeURIComponent(brand)}` : `/admin/jobs/${jobId}`;

  if (loading) return <div className="p-6 text-[#004A4E]">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-[#004A4E]/10 text-[#004A4E]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-[#004A4E]">Jobs</h1>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              brand ? `/admin/upload-job?subdomain=${encodeURIComponent(brand)}` : "/admin/upload-job"
            )
          }
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500 text-sm">No jobs yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const description =
              job.description && job.description.length > 180
                ? job.description.slice(0, 179).trim() + "…"
                : job.description || "";
            const applicantCount = job.applicationCount ?? 0;
            return (
              <article
                key={job._id}
                className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 min-h-[200px]"
              >
                <button
                  type="button"
                  onClick={() => router.push(jobDetailHref(job._id))}
                  className="flex-1 min-h-0 text-left block w-full group"
                >
                  <h2 className="text-[#004A4E] font-bold text-lg leading-tight group-hover:underline">
                    {job.title}
                  </h2>
                  {description ? (
                    <p className="text-sm text-gray-600 leading-relaxed mt-2 line-clamp-3">
                      {description}
                    </p>
                  ) : (
                    <div className="mt-2 min-h-[3rem]" />
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {job.questions?.length ?? 0} questions
                  </p>
                </button>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {job.jdLink && (
                    <a
                      href={job.jdLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border-2 border-[#004A4E] text-[#004A4E] text-sm font-medium hover:bg-[#004A4E]/5 transition-colors"
                    >
                      <FileText className="w-4 h-4 shrink-0" /> View JD
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(jobDetailHref(job._id))}
                    className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 shrink-0" /> View applicants ({applicantCount})
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
