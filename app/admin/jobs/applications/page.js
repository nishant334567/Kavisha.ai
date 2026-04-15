"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function AdminAllApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/jobs/applications?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setApplications(
            res.ok && Array.isArray(data.applications) ? data.applications : []
          );
        }
      } catch {
        if (!cancelled) setApplications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand]);

  if (loading) return <div className="p-6 text-highlight">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-highlight">All applications</h1>
          <p className="mt-0.5 text-sm text-muted">
            Every application across job listings for this brand
          </p>
        </div>
      </div>

      {!brand ? (
        <p className="text-sm text-muted">Missing brand context.</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-muted">No applications yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {applications.map((a) => (
            <li key={a._id}>
              <Link
                href={`/admin/jobs/${a.jobId}/applications/${a._id}${qs}`}
                className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition hover:bg-muted-bg/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{a.jobTitle}</p>
                  <p className="truncate text-sm text-muted">
                    {a.applicantName ? `${a.applicantName} · ` : ""}
                    {a.applicantEmail}
                  </p>
                  {a.status ? (
                    <p className="mt-1 text-xs text-muted">Status: {a.status}</p>
                  ) : null}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-highlight">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
