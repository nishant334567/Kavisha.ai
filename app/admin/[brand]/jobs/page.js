"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, FileText, Plus } from "lucide-react";

export default function JobsPage() {
  const router = useRouter();
  const brand = useBrandContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand?.subdomain) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs?brand=${encodeURIComponent(brand.subdomain)}`);
        const data = await res.json();
        setJobs(res.ok ? (data.jobs ?? []) : []);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand?.subdomain]);

  if (loading) return <div className="p-6 text-[#004A4E]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
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
          onClick={() => router.push(`/admin/${brand?.subdomain}/upload-job`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004A4E] text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-gray-500 text-sm">No jobs yet.</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <button
              key={job._id}
              type="button"
              onClick={() => router.push(`/admin/${brand?.subdomain}/jobs/${job._id}`)}
              className="w-full text-left block p-4 rounded-xl border border-[#004A4E]/20 bg-white hover:bg-[#004A4E]/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#004A4E]/10 text-[#004A4E]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-[#004A4E]">{job.title}</h2>
                  {job.description ? (
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{job.description}</p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">
                    {job.questions?.length ?? 0} questions
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
