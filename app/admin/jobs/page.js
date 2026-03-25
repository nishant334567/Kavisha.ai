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
  const applicationsHref = (jobId) =>
    brand ? `/admin/jobs/${jobId}/applications?subdomain=${encodeURIComponent(brand)}` : `/admin/jobs/${jobId}/applications`;

  if (loading) return <div className="p-6 text-highlight">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-highlight hover:bg-[#004A4E]/10"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-highlight">Jobs</h1>
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
        <p className="text-sm text-muted">No jobs yet.</p>
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
                className="flex min-h-[200px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => router.push(jobDetailHref(job._id))}
                  className="flex-1 min-h-0 text-left block w-full group"
                >
                  <h2 className="text-highlight font-bold text-lg leading-tight group-hover:underline">
                    {job.title}
                  </h2>
                  {description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {description}
                    </p>
                  ) : (
                    <div className="mt-2 min-h-[3rem]" />
                  )}
                  <p className="mt-2 text-xs text-muted">
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
                      className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-highlight px-4 py-2 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg"
                    >
                      <FileText className="w-4 h-4 shrink-0" /> View JD
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(applicationsHref(job._id))}
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
