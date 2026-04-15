"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, ArrowRight, FileText, ExternalLink, Users, Trash2 } from "lucide-react";

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
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!brand || !params?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setJob(res.ok ? (data.job ?? null) : null);
    } catch {
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [brand, params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const jobsListHref = brand
    ? `/admin/jobs?subdomain=${encodeURIComponent(brand)}`
    : "/admin/jobs";

  const togglePublished = async () => {
    if (!brand || !params?.id || !job || busy) return;
    const currentlyLive = job.published !== false;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ published: !currentlyLive }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.job) setJob(data.job);
    } finally {
      setBusy(false);
    }
  };

  const deleteJob = async () => {
    if (!brand || !params?.id || busy) return;
    if (!window.confirm("Delete this job and all applications? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/jobs/${params.id}?brand=${encodeURIComponent(brand)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) router.replace(jobsListHref);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-highlight">Loading…</div>;
  if (!job) return <div className="p-6 text-muted">Job not found.</div>;

  const live = job.published !== false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-[#004A4E]/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-highlight">Job detail</h1>
      </div>

      <div className="mb-4 space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="text-lg font-medium text-highlight">{job.title}</h2>
          {!live ? (
            <p className="mt-1 text-xs font-medium text-muted">Unpublished — hidden from public job pages</p>
          ) : null}
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
          <FileText className="h-4 w-4" /> View JD <ExternalLink className="h-3.5 w-3.5" />
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

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void togglePublished()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
          >
            {live ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void deleteJob()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
          >
            <Trash2 className="h-4 w-4" />
            Delete job
          </button>
        </div>
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
        <span className="flex items-center gap-2 font-medium text-highlight">
          <Users className="h-5 w-5" /> View applicants
        </span>
        <ArrowRight className="h-5 w-5 text-muted" />
      </button>
    </div>
  );
}
