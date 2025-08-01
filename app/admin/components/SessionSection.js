"use client";
import { useState, useMemo } from "react";
import SessionFilters from "./SessionFilters";

export default function SessionSection({ totalSessions }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    logCount: "all",
    roleType: "all",
    completionStatus: "all",
  });

  const fetchSessions = async (pageNum) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/fetch-all-chats?page=${pageNum}`
      );
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setSessions(data.data.sessions);
        } else {
          setSessions((prev) => [...prev, ...data.data.sessions]);
        }
        setHasMore(data.data.pagination.hasMore);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded) {
      fetchSessions(1);
    }
    setIsExpanded(!isExpanded);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSessions(nextPage);
    }
  };

  // Filter sessions based on current filters
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Log count filter
      if (filters.logCount !== "all") {
        const logCount = session.logs?.length || 0;
        switch (filters.logCount) {
          case "0":
            if (logCount !== 0) return false;
            break;
          case "1-5":
            if (logCount < 1 || logCount > 5) return false;
            break;
          case "6-10":
            if (logCount < 6 || logCount > 10) return false;
            break;
          case "11-20":
            if (logCount < 11 || logCount > 20) return false;
            break;
          case "20+":
            if (logCount <= 20) return false;
            break;
        }
      }

      // Role type filter
      if (filters.roleType !== "all" && session.role !== filters.roleType) {
        return false;
      }

      // Completion status filter
      if (filters.completionStatus !== "all") {
        const isCompleted = session.allDataCollected;
        if (filters.completionStatus === "completed" && !isCompleted)
          return false;
        if (filters.completionStatus === "in_progress" && isCompleted)
          return false;
      }

      return true;
    });
  }, [sessions, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="mt-8">
      <button
        onClick={handleToggle}
        className="w-full bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            All Sessions ({totalSessions})
          </h2>
          <span className="text-gray-500">{isExpanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 bg-white rounded-lg shadow p-6">
          {/* Filters */}
          <SessionFilters
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filteredSessions.map((session, index) => (
              <div key={session._id || index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">
                    {session.title || "Untitled Session"}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      session.role === "job_seeker"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {session.role}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">User:</span>{" "}
                    {session.userId?.name || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {session.userId?.email || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>
                    <span
                      className={`ml-1 ${
                        session.allDataCollected
                          ? "text-green-600 font-medium"
                          : "text-orange-600 font-medium"
                      }`}
                    >
                      {session.allDataCollected
                        ? "✅ Completed"
                        : "⏳ In Progress"}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Updated:</span>{" "}
                    {new Date(session.updatedAt).toLocaleString()}
                  </p>
                </div>

                {session.chatSummary && (
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">Summary:</span>{" "}
                    {session.chatSummary.slice(0, 100)}
                    {session.chatSummary.length > 100 ? "..." : ""}
                  </p>
                )}

                {/* Chat Logs Section */}
                {session.logs && session.logs.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      Chat Logs ({session.logs.length})
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {session.logs.map((log, logIndex) => (
                          <div key={logIndex} className="text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  log.role === "user"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {log.role === "user" ? "👤 User" : "🤖 AI"}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-white rounded p-2 text-xs text-gray-700">
                              {log.message.length > 200
                                ? `${log.message.slice(0, 200)}...`
                                : log.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Loading..." : "Load More Sessions"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
