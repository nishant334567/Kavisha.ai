"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, ArrowRight, FileText, ExternalLink, Users } from "lucide-react";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand || !params?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand)}`);
        const data = await res.json();
        setJob(res.ok ? (data.job ?? null) : null);
      } catch {
        setJob(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand, params?.id]);

  if (loading) return <div className="p-6 text-highlight">Loading…</div>;
  if (!job) return <div className="p-6 text-muted">Job not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-[#004A4E]/10"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-highlight">Job detail</h1>
      </div>

      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="text-lg font-medium text-highlight">{job.title}</h2>
          {job.description ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{job.description}</p>
          ) : null}
        </div>

        <a
          href={job.jdLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-highlight hover:underline"
        >
          <FileText className="w-4 h-4" /> View JD <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {job.questions?.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-medium text-highlight">Questions ({job.questions.length})</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted">
              {job.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(
            brand
              ? `/admin/jobs/${params.id}/applications?subdomain=${encodeURIComponent(brand)}`
              : `/admin/jobs/${params.id}/applications`
          )
        }
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted-bg"
      >
        <span className="flex items-center gap-2 text-highlight font-medium">
          <Users className="w-5 h-5" /> View applicants
        </span>
        <ArrowRight className="h-5 w-5 text-muted" />
      </button>
    </div>
  );
}
