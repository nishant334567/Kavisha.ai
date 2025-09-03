"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BrandAdminPage() {
  const params = useParams();
  const brand = (params?.brand || "").toLowerCase();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-orange-50 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Brand Dashboard</h1>
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
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
    <div className="min-h-screen bg-orange-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {brand.toUpperCase()} Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Job Seekers
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Users</span>
                <span className="font-semibold">
                  {counts.jobSeeker?.users ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions</span>
                <span className="font-semibold">
                  {counts.jobSeeker?.sessions ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">All data collected</span>
                <span className="font-semibold text-green-600">
                  {counts.jobSeeker?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Recruiters
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions</span>
                <span className="font-semibold">
                  {counts.recruiter?.sessions ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">All data collected</span>
                <span className="font-semibold text-green-600">
                  {counts.recruiter?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Sessions (All)
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-semibold">
                  {counts.sessions?.total ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">All data collected</span>
                <span className="font-semibold text-green-600">
                  {counts.sessions?.allDataCollected ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Seeker Sessions - minimal list */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Job Seeker Sessions
          </h2>
          {list.length === 0 ? (
            <div className="text-gray-500">No sessions found.</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {list.map((s, idx) => (
                <li key={idx} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="mr-4">
                      <div className="text-sm font-medium text-slate-800">
                        {s.name || "Unknown"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.email || "-"}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        s.allDataCollected
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-orange-50 text-orange-700 border-orange-200"
                      }`}
                    >
                      {s.allDataCollected ? "All data collected" : "Pending"}
                    </span>
                  </div>
                  {s.chatSummary && (
                    <div className="mt-2 text-sm text-slate-700">
                      {s.chatSummary}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
