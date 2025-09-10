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
  const [match, setMatch] = useState(null);
  const [showMatches, setShowMatches] = useState(false);
  const [currentSessionTitle, setCurrentSessionTitle] = useState("");
  const [loadingMatches, setLoadingMatches] = useState({});

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

  const closeMatches = () => {
    setShowMatches(false);
    setMatch(null);
    setCurrentSessionTitle("");
  };

  // Modal component for displaying matches
  const MatchesModal = () => {
    if (!showMatches) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              Matches for: {currentSessionTitle}
            </h2>
            <button
              onClick={closeMatches}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {Object.values(loadingMatches).some((loading) => loading) ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : match && match.length > 0 ? (
              <div className="space-y-6">
                {match.map((matchItem, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Match #{index + 1}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(matchItem.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {matchItem.matchPercentage || "N/A"}% Match
                        </span>
                      </div>
                    </div>

                    {/* User Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* From User */}
                      <div className="bg-white rounded-lg p-3 border">
                        <h4 className="font-medium text-gray-700 mb-2">
                          From User
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Name:</span>{" "}
                            {matchItem.fromUser?.name}
                          </p>
                          <p>
                            <span className="font-medium">Email:</span>{" "}
                            {matchItem.fromUser?.email}
                          </p>
                          <p>
                            <span className="font-medium">Session:</span>{" "}
                            {matchItem.fromUser?.sessionTitle}
                          </p>
                          <p>
                            <span className="font-medium">Role:</span>{" "}
                            {matchItem.fromUser?.sessionRole}
                          </p>
                        </div>
                      </div>

                      {/* To User */}
                      <div className="bg-white rounded-lg p-3 border">
                        <h4 className="font-medium text-gray-700 mb-2">
                          To User
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Name:</span>{" "}
                            {matchItem.toUser?.name}
                          </p>
                          <p>
                            <span className="font-medium">Email:</span>{" "}
                            {matchItem.toUser?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="space-y-3">
                      {matchItem.matchingReason && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h5 className="font-medium text-green-800 mb-1">
                            ✅ Matching Reasons
                          </h5>
                          <p className="text-sm text-green-700">
                            {matchItem.matchingReason}
                          </p>
                        </div>
                      )}

                      {matchItem.mismatchReason && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h5 className="font-medium text-yellow-800 mb-1">
                            ⚠️ Mismatch Reasons
                          </h5>
                          <p className="text-sm text-yellow-700">
                            {matchItem.mismatchReason}
                          </p>
                        </div>
                      )}

                      {matchItem.chatSummary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h5 className="font-medium text-blue-800 mb-1">
                            💬 Chat Summary
                          </h5>
                          <p className="text-sm text-blue-700">
                            {matchItem.chatSummary}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Contact Status */}
                    {matchItem.contacted !== undefined && (
                      <div className="mt-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            matchItem.contacted
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {matchItem.contacted
                            ? "✅ Contacted"
                            : "⏳ Not Contacted"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">
                  No matches found for this session.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-end">
            <button
              onClick={closeMatches}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
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

      {/* Matches Modal */}
      <MatchesModal />
    </div>
  );
}
