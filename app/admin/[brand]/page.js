"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BrandAdminPage() {
  const params = useParams();
  const brand = (params?.brand || "").toLowerCase();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // const [reader,setReader] - useState(false)
  useEffect(() => {
    if (!brand) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/overview/${brand}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json?.success) {
          throw new Error(json?.message || "Failed to load brand overview");
        }
        setData(json);
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [brand]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-slate-900 mb-4">
            Brand Dashboard
          </h1>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error || data?.message || "Failed to load brand overview"}
          </div>
        </div>
      </div>
    );
  }

  const counts = data.counts || {};
  const list = Array.isArray(data.jobSeekerAllSessions)
    ? data.jobSeekerAllSessions
    : [];

  return (
    <div className="h-screen bg-white p-6 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {brand.toUpperCase()} Dashboard
            </h1>
            <p className="mt-1 text-slate-600 text-sm">
              Overview of sessions and activity.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">
                Job Seekers
              </h2>
              <span className="text-slate-400">👤</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Users</span>
                <span className="font-semibold text-slate-900">
                  {counts.jobSeeker?.users ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sessions</span>
                <span className="font-semibold text-slate-900">
                  {counts.jobSeeker?.sessions ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>All data collected</span>
                <span className="font-semibold text-emerald-700">
                  {counts.jobSeeker?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">Recruiters</h2>
              <span className="text-slate-400">🏢</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sessions</span>
                <span className="font-semibold text-slate-900">
                  {counts.recruiter?.sessions ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>All data collected</span>
                <span className="font-semibold text-emerald-700">
                  {counts.recruiter?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-700">
                Sessions (All)
              </h2>
              <span className="text-slate-400">💬</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total</span>
                <span className="font-semibold text-slate-900">
                  {counts.sessions?.total ?? 0}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>All data collected</span>
                <span className="font-semibold text-emerald-700">
                  {counts.sessions?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions grid */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Job Seeker Sessions
          </h2>
          {list.length === 0 ? (
            <div className="text-slate-500 text-sm">No sessions found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="mr-4">
                      <div className="text-sm font-medium text-slate-900">
                        {s.name || "Unknown"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.email || "-"}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${s.allDataCollected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}
                    >
                      {s.allDataCollected ? "All data collected" : "Pending"}
                    </span>
                  </div>
                  {s.chatSummary && (
                    <div className="mt-2 text-sm text-slate-700 line-clamp-3">
                      {s.chatSummary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
