"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, Clock } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";

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

export default function JobsPostedPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const brandName = brandContext?.brandName || brand;
  const { user, loading: authLoading } = useFirebaseSession();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const qs = useMemo(
    () => (brand ? `?subdomain=${encodeURIComponent(brand)}` : ""),
    [brand]
  );

  useEffect(() => {
    if (!brand || !user?.id) {
      setLoading(false);
      setSessions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/jobs/requirement-sessions?brand=${encodeURIComponent(brand)}`,
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
        <h1 className="text-xl font-bold text-foreground">Your job requirements</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in to see chats where you described what you need—when no listed job fit or you
          preferred to go direct.
        </p>
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
          <h1 className="text-2xl font-bold">Your job requirements</h1>
          
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-highlight">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          You haven&apos;t started one yet. From{" "}
          <Link href={`/jobs${qs}`} className="font-medium text-highlight underline">
            all jobs
          </Link>
          , use &quot;Post your requirement&quot; when nothing listed fits what you need.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s._id}>
              <Link
                href={`/jobs/posted/${s._id}${qs}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted-bg/20 px-4 py-3 transition hover:bg-muted-bg/40 dark:border-border/40"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{s.title}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {formatDate(s.createdAt)}
                  </span>
                </div>
                {s.allDataCollected ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/45 dark:text-emerald-300"
                    title="You completed this requirement in chat"
                  >
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                    Completed
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
                    title="Open the chat to finish — onboarding not complete yet"
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    In progress
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
