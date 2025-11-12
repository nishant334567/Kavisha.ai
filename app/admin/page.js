"use client";

import SessionSection from "./components/SessionSection";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

export default function Admin() {
  const router = useRouter();
  const { user, loading } = useFirebaseSession();
  const brand = useBrandContext();
  const [stats, setStats] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");

  // Auth gate (client-side)
  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Brand admin gate: kavisha only
  const brandLoaded = !!brand;
  const canView =
    brandLoaded &&
    brand?.brandName?.toLowerCase() === "kavisha.ai" &&
    brand?.isBrandAdmin;

  useEffect(() => {
    if (!user || !canView) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/overview?countsOnly=true`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.message || "Failed to load");
        setStats({
          stats: {
            totalUser: json.counts.totalUsers,
            totalUserWithJobSeekers: json.counts.jobSeekerCount,
            totalUserWithRecruiter: json.counts.recruiterCount,
            totalChatSessions: json.counts.allSessionCount,
            totalMatches: json.counts.matchesCount,
            totalConnections: json.counts.connectionsCount,
            totalJobSeekerSession: json.counts.jobSeekerCount, // legacy mapping
            totalJobSeekerNotInitiated: 0,
            totalJobSeekerSessionInitiated: 0,
            totalJobSeekerCompletedSession: json.counts.allDataCollectedCount,
            totalRecruiterSession: json.counts.recruiterCount,
            totalRecruiterNotInitiated: 0,
            totalRecruiterWithSessionInitiated: 0,
            totalRecruiterWithCompletedSession:
              json.counts.allDataCollectedCount,
          },
        });
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setDataLoading(false);
      }
    };
    setDataLoading(true);
    load();
  }, [canView, user]);

  // While auth or brand context is loading
  if (loading || !brandLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  // If authenticated but not allowed, redirect to login with reason
  if (user && !canView) {
    router.replace("/login?reason=unauthorized");
    return null;
  }

  // While data is loading after canView
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-red-700">
          {error || "Failed to load admin overview"}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* User Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Users</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Users:</span>
                <span className="font-semibold">{stats.stats.totalUser}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Job Seekers:</span>
                <span className="font-semibold">
                  {stats.stats.totalUserWithJobSeekers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recruiters:</span>
                <span className="font-semibold">
                  {stats.stats.totalUserWithRecruiter}
                </span>
              </div>
            </div>
          </div>

          {/* Job Seeker Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Job Seeker Sessions
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">
                  {stats.stats.totalJobSeekerSession}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Initiated:</span>
                <span className="font-semibold text-orange-600">
                  {stats.stats.totalJobSeekerNotInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-semibold text-blue-600">
                  {stats.stats.totalJobSeekerSessionInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">
                  {stats.stats.totalJobSeekerCompletedSession}
                </span>
              </div>
            </div>
          </div>

          {/* Recruiter Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Recruiter Sessions
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">
                  {stats.stats.totalRecruiterSession}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Initiated:</span>
                <span className="font-semibold text-orange-600">
                  {stats.stats.totalRecruiterNotInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-semibold text-blue-600">
                  {stats.stats.totalRecruiterWithSessionInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">
                  {stats.stats.totalRecruiterWithCompletedSession}
                </span>
              </div>
            </div>
          </div>

          {/* Connections & Matches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Engagement
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sessions:</span>
                <span className="font-semibold">
                  {stats.stats.totalChatSessions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Matches:</span>
                <span className="font-semibold text-purple-600">
                  {stats.stats.totalMatches}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connections:</span>
                <span className="font-semibold text-indigo-600">
                  {stats.stats.totalConnections}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.stats.totalUser}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.stats.totalChatSessions}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.stats.totalMatches}
              </div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {stats.stats.totalConnections}
              </div>
              <div className="text-sm text-gray-600">Total Connections</div>
            </div>
          </div>
        </div>

        {/* Interactive Sessions Section */}
        <SessionSection totalSessions={stats.stats.totalChatSessions} />
      </div>
    </div>
  );
}
