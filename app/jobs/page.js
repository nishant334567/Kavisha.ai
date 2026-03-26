"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft } from "lucide-react";
import JobCard from "@/app/components/JobCard";

export default function JobsPage() {
  const router = useRouter();
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const brandName = brandContext?.brandName || brand;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);

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

  return (
    <div className="mx-auto max-w-6xl bg-background px-4 py-6 text-foreground">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="mt-0.5 text-sm text-muted">
            All jobs listed {brandName ? `by ${brandName}` : ""}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-highlight">Loading…</div>
      ) : jobs.length === 0 ? (
        <p className="py-8 text-sm text-muted">No jobs yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
