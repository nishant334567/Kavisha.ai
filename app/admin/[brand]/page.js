"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BrandAdminPage() {
  const params = useParams();
  const brand = (params?.brand || "").toLowerCase();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [filters, setFilters] = useState({ role: "all", status: "all" });
  const [searchType, setSearchType] = useState("job_seeker");

  const statusOptions = [
    "rejected",
    "on hold",
    "on boarded",
    "in progress",
    "completed",
  ];

  const updateSessionStatus = async (sessionId, newStatus) => {
    setUpdating((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch(`/api/admin/update-session-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setData((prev) => ({
          ...prev,
          sessions: prev.sessions.map((session) =>
            session._id === sessionId
              ? { ...session, status: newStatus }
              : session
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          type: searchType,
          brand: brand,
        }),
      });

      const result = await response.json();
      if (result.matches) {
        setSearchResults(result.matches);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const applyFilters = (allSessions) => {
    return allSessions.filter((session) => {
      const roleMatch = filters.role === "all" || session.role === filters.role;
      const statusMatch =
        filters.status === "all" || session.status === filters.status;
      return roleMatch && statusMatch;
    });
  };

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

  const allSessions = Array.isArray(data.sessions) ? data.sessions : [];
  const sessions = searchResults
    ? applyFilters(searchResults)
    : applyFilters(allSessions);

  return (
    <div className="h-screen bg-white p-6 overflow-y-auto">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {brand.toUpperCase()} Sessions
          </h1>
          <p className="mt-1 text-slate-600">
            {searchResults
              ? `Search results (${sessions.length})`
              : `All sessions (${sessions.length})`}
          </p>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="job_seeker">Job Seekers</option>
              <option value="recruiter">Recruiters</option>
              <option value="lead_journey">Lead Journey</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions in natural language..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? "Searching..." : "Search"}
            </button>
            {searchResults && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Filter Buttons */}

        <div className="mb-6 flex flex-wrap gap-2">
          {/* Role Filter */}
          <div className="flex gap-1">
            <span className="text-sm text-gray-600 px-2 py-1">Role:</span>
            {["all", "job_seeker", "recruiter", "dating", "lead_journey"].map(
              (role) => (
                <button
                  key={role}
                  onClick={() => setFilters((prev) => ({ ...prev, role }))}
                  className={`px-3 py-1 text-xs rounded-full ${
                    filters.role === role
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {role === "all" ? "All" : role.replace("_", " ")}
                </button>
              )
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            <span className="text-sm text-gray-600 px-2 py-1">Status:</span>
            {[
              "all",
              "rejected",
              "on hold",
              "on boarded",
              "in progress",
              "completed",
            ].map((status) => (
              <button
                key={status}
                onClick={() => setFilters((prev) => ({ ...prev, status }))}
                className={`px-3 py-1 text-xs rounded-full ${
                  filters.status === status
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4 overflow-y-auto scrollbar-none grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No sessions found.
            </div>
          ) : (
            sessions.map((session, idx) => (
              <div
                key={session._id || idx}
                className="rounded-lg border border-slate-200 p-6 bg-white shadow-sm"
              >
                <div className=" gap-4">
                  {/* User Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {session.user?.name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {session.user?.email || "No email"}
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {session.role || "Unknown Role"}
                      </span>
                    </div>

                    {/* Status Update Dropdown for Job Seekers */}
                    {session.role === "job_seeker" && (
                      <div className="mt-3">
                        <select
                          value={session.status || ""}
                          onChange={(e) =>
                            updateSessionStatus(session._id, e.target.value)
                          }
                          disabled={updating[session._id]}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Status</option>
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {updating[session._id] && (
                          <span className="ml-2 text-xs text-gray-500">
                            Updating...
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Session Info */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      Session Details
                    </h4>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>
                        Status:{" "}
                        <span className="font-medium">
                          {session.status || "Unknown"}
                        </span>
                      </div>
                      <div>
                        Data Collected:{" "}
                        <span className="font-medium">
                          {session.allDataCollected ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        Brand:{" "}
                        <span className="font-medium">
                          {session.brand || "Unknown"}
                        </span>
                      </div>
                      <div>
                        Created:{" "}
                        <span className="font-medium">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      Summary
                    </h4>
                    {session.chatSummary ? (
                      <p className="text-sm text-slate-600 line-clamp-4">
                        {session.chatSummary}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        No chat summary available
                      </p>
                    )}
                  </div>
                </div>

                {/* Resume Info */}
                {session.resumeSummary && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      Resume Summary
                    </h4>
                    <p className="text-sm text-slate-600">
                      {session.resumeSummary}
                    </p>
                    {session.resumeFilename && (
                      <p className="text-xs text-slate-500 mt-1">
                        File: {session.resumeFilename}
                      </p>
                    )}
                  </div>
                )}

                {/* Title */}
                {session.title && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-1">
                      Title
                    </h4>
                    <p className="text-sm text-slate-600">{session.title}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
