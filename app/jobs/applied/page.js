"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";

export default function JobsAppliedPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const brandName = brandContext?.brandName || brand;
  const { user, loading: authLoading } = useFirebaseSession();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(
    () => (brand ? `?subdomain=${encodeURIComponent(brand)}` : ""),
    [brand]
  );

  useEffect(() => {
    if (!brand || !user?.id) {
      setLoading(false);
      setApplications([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/job-apply/my-applications?brand=${encodeURIComponent(brand)}`,
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
  }, [brand, user?.id]);

  if (authLoading) {
    return (
      <div className="px-4 py-12 text-center text-highlight">Loading…</div>
    );
  }

  if (!user?.id) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-lg p-2 text-highlight hover:bg-muted-bg"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Applied jobs</h1>
        <p className="mt-2 text-sm text-muted">Sign in to see jobs you applied to.</p>
        <button
          type="button"
          onClick={() => void signIn()}
          className="mt-6 rounded-xl bg-highlight px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 text-foreground">
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
          <h1 className="text-2xl font-bold">Applied jobs</h1>
          <p className="mt-0.5 text-sm text-muted">
            {brandName ? `Applications on ${brandName}` : "Your applications"}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-highlight">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-muted">
          You haven&apos;t applied to any jobs here yet. Browse{" "}
          <Link href={`/jobs${qs}`} className="font-medium text-highlight underline">
            all jobs
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {applications.map((a) => (
            <li key={a.applicationId}>
              <Link
                href={`/jobs/${a.jobId}${qs}`}
                className="block rounded-xl border border-border/50 bg-muted-bg/20 px-4 py-3 transition hover:bg-muted-bg/40 dark:border-border/40"
              >
                <span className="font-medium text-foreground">{a.title}</span>
                {a.status ? (
                  <span className="mt-1 block text-xs text-muted">Status: {a.status}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
