"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";
import { ArrowLeft } from "lucide-react";
import JobCard from "@/app/components/JobCard";
import {
  getJobSeekerServiceKey,
  JOB_SEEKER_CHAT_TITLE,
  JOB_SEEKER_OPENING_MESSAGE,
} from "@/app/lib/jobSeekerIntro";
import {
  getEffectiveCommunityPrimaryColorStr,
  normalizeBrandHex,
} from "@/app/lib/brandTheme";

export default function JobsPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const { user, loading: authLoading, refresh } = useFirebaseSession();
  const brand = brandContext?.subdomain;
  const brandName = brandContext?.brandName || brand;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [postingRequirement, setPostingRequirement] = useState(false);

  const jobSeekerServiceKey = useMemo(
    () => getJobSeekerServiceKey(brandContext?.services),
    [brandContext?.services]
  );
  const primaryHex = normalizeBrandHex(
    getEffectiveCommunityPrimaryColorStr(brandContext),
  );

  useEffect(() => {
    if (!brand) return;
    (async () => {
      try {
        const res = await fetch(`/api/jobs?brand=${encodeURIComponent(brand)}`);
        const data = await res.json();
        setJobs(res.ok ? (data.jobs ?? []) : []);
      } catch {
        setJobs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/job-apply/applied-ids", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        setAppliedJobIds(res.ok && Array.isArray(data.jobIds) ? data.jobIds : []);
      } catch {
        setAppliedJobIds([]);
      }
    })();
  }, []);

  const handlePostRequirement = useCallback(async () => {
    if (!brand || !jobSeekerServiceKey) return;
    if (!user?.id) {
      try {
        await signIn();
        await refresh();
      } catch {
        /* auth popup blocked etc. */
      }
      return;
    }
    setPostingRequirement(true);
    try {
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: "job_seeker",
          brand,
          initialmessage: JOB_SEEKER_OPENING_MESSAGE,
          isCommunityChat: false,
          chatName: JOB_SEEKER_CHAT_TITLE,
          serviceKey: jobSeekerServiceKey,
          isJobsRequirementPost: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success && data?.sessionId) {
        router.push(`/jobs/posted/${data.sessionId}`);
      }
    } catch (e) {
      console.error("[jobs] post requirement:", e);
    } finally {
      setPostingRequirement(false);
    }
  }, [brand, jobSeekerServiceKey, user?.id, refresh, router]);

  const showJobsListCta =
    !loading && jobs.length > 0 && Boolean(jobSeekerServiceKey);

  return (
    <div className="mx-auto max-w-6xl bg-background px-4 py-6 text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
            <p className="mt-0.5 text-sm text-muted">
              All jobs listed {brandName ? `by ${brandName}` : ""}
            </p>
          </div>
        </div>
        {showJobsListCta ? (
          <div className="flex shrink-0 flex-col gap-1 rounded-xl border border-border/50 bg-muted-bg/25 px-3 py-2.5 dark:border-border/40 dark:bg-muted-bg/15 sm:ml-auto sm:max-w-[280px] sm:items-end sm:text-right">
            <p className="text-xs leading-snug text-muted">
              Didn&apos;t find your required jobs?
            </p>
            <button
              type="button"
              onClick={() => void handlePostRequirement()}
              disabled={postingRequirement || authLoading}
              className={`text-left text-sm font-semibold underline underline-offset-2 transition hover:opacity-90 disabled:opacity-50 sm:text-right ${!primaryHex ? "text-highlight" : ""}`}
              style={primaryHex ? { color: primaryHex } : undefined}
            >
              {postingRequirement
                ? "Starting…"
                : user?.id
                  ? "Click here to post one"
                  : "Sign in to post one"}
            </button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="py-12 text-center text-highlight">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="mx-auto max-w-md py-10 text-center">
          <p className="text-sm text-muted">No jobs listed yet.</p>
          {jobSeekerServiceKey ? (
            <>
              
              <button
                type="button"
                onClick={() => void handlePostRequirement()}
                disabled={postingRequirement || authLoading}
                className={`mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 ${!primaryHex ? "bg-highlight" : ""}`}
                style={
                  primaryHex
                    ? { backgroundColor: primaryHex }
                    : undefined
                }
              >
                {postingRequirement
                  ? "Starting…"
                  : user?.id
                    ? "Post your requirement"
                    : "Sign in to post your requirement"}
              </button>
            </>
          ) : (
            <p className="mt-4 text-xs text-muted">
              Job seeker chat isn&apos;t set up for this brand yet.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              alreadyApplied={appliedJobIds.includes(String(job._id))}
              brand={brand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
