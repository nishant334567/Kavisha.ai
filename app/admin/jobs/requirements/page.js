"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft } from "lucide-react";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

export default function AdminNewRequirementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const [sessions, setSessions] = useState([]);
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
          `/api/admin/jobs/requirement-sessions?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setSessions(res.ok && Array.isArray(data.sessions) ? data.sessions : []);
        }
      } catch {
        if (!cancelled) setSessions([]);
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
          <h1 className="text-xl font-semibold text-highlight">New requirements</h1>
     
        </div>
      </div>

      {!brand ? (
        <p className="text-sm text-muted">Missing brand context.</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted">No new requirements yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s._id}>
              <Link
                href={`/admin/jobs/requirements/${s._id}${qs}`}
                className="block rounded-xl border border-border bg-card p-4 transition hover:bg-muted-bg/40"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {[s.userName, s.userEmail].filter(Boolean).join(" · ") || "User"}
                </p>
                <p className="mt-2 text-xs text-muted">{formatDate(s.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
