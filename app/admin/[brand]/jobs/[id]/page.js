"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const brand = useBrandContext();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand?.subdomain || !params?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand.subdomain)}`);
        const data = await res.json();
        setJob(res.ok ? (data.job ?? null) : null);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand?.subdomain, params?.id]);

  if (loading) return <div className="p-6 text-[#004A4E]">Loading…</div>;
  if (!job) return <div className="p-6 text-gray-500">Job not found.</div>;

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
        <h1 className="text-xl font-semibold text-[#004A4E]">Job detail</h1>
      </div>

      <div className="p-4 rounded-xl border border-[#004A4E]/20 bg-white space-y-4">
        <div>
          <h2 className="text-lg font-medium text-[#004A4E]">{job.title}</h2>
          {job.description ? (
            <p className="text-sm text-gray-600 mt-1">{job.description}</p>
          ) : null}
        </div>

        <a
          href={job.jdLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[#004A4E] font-medium hover:underline"
        >
          <FileText className="w-4 h-4" /> View JD <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {job.questions?.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-[#004A4E] mb-2">Questions ({job.questions.length})</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {job.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
