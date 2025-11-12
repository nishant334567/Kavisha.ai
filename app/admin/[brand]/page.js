"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useBrandContext } from "../../context/brand/BrandContextProvider";
import Livechat from "../../components/LiveChat";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { useRouter } from "next/navigation";
export default function BrandAdminPage() {
  const params = useParams();
  const brand = (params?.brand || "").toLowerCase();
  const { user } = useFirebaseSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState({});
  const [searchResults, setSearchResults] = useState(null);
  const [filters, setFilters] = useState({ role: "all", status: "all" });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResults, setEmailResults] = useState(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [commentUpdating, setCommentUpdating] = useState({});
  const [showIndividualEmailModal, setShowIndividualEmailModal] =
    useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [individualEmailData, setIndividualEmailData] = useState({
    subject: "",
    body: "",
  });
  const [sendingIndividualEmail, setSendingIndividualEmail] = useState(false);
  const [assigning, setAssigning] = useState({});
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const brandContext = useBrandContext();
  const statusOptions = [
    "session initiated",
    "completed",
    "in progress",
    "onboarded",
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

  const updateSessionComment = async (sessionId, comment) => {
    setCommentUpdating((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch(`/api/admin/update-session-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, comment }),
      });

      if (response.ok) {
        // Update local state
        setData((prev) => ({
          ...prev,
          sessions: prev.sessions.map((session) =>
            session._id === sessionId
              ? { ...session, comment: comment }
              : session
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setCommentUpdating((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const assignSession = async (sessionId, assignedTo) => {
    setAssigning((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch(`/api/admin/assign-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, assignedTo }),
      });

      if (response.ok) {
        // Update local state
        setData((prev) => ({
          ...prev,
          sessions: prev.sessions.map((session) =>
            session._id === sessionId
              ? { ...session, assignedTo: assignedTo }
              : session
          ),
        }));
      }
    } catch (error) {
      console.error("Failed to assign session:", error);
    } finally {
      setAssigning((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.body.trim()) {
      alert("Please enter both subject and body");
      return;
    }

    setSendingEmail(true);
    try {
      const recipients = sessions
        .map((session) => ({
          email: session.user?.email,
          name: session.user?.name,
        }))
        .filter((recipient) => recipient.email);

      if (recipients.length === 0) {
        alert("No valid email addresses found in filtered sessions");
        return;
      }

      const response = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: emailData.subject,
          body: emailData.body,
          brand: brand,
        }),
      });

      const result = await response.json();
      setEmailResults(result);

      if (result.success) {
        setShowEmailModal(false);
        setEmailData({ subject: "", body: "" });
      }
    } catch (error) {
      console.error("Failed to send emails:", error);
      alert("Failed to send emails. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendIndividualEmail = async () => {
    if (
      !individualEmailData.subject.trim() ||
      !individualEmailData.body.trim()
    ) {
      alert("Please enter both subject and body");
      return;
    }

    if (!selectedSession?.user?.email) {
      alert("No email address found for this user");
      return;
    }

    setSendingIndividualEmail(true);
    try {
      const recipients = [
        {
          email: selectedSession.user.email,
          name: selectedSession.user.name,
        },
      ];

      const response = await fetch("/api/admin/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: individualEmailData.subject,
          body: individualEmailData.body,
          brand: brand,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowIndividualEmailModal(false);
        setIndividualEmailData({ subject: "", body: "" });
        setSelectedSession(null);
        alert("Email sent successfully!");
      } else {
        alert("Failed to send email. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setSendingIndividualEmail(false);
    }
  };

  const applyFilters = (allSessions) => {
    return allSessions.filter((session) => {
      const roleMatch = filters.role === "all" || session.role === filters.role;
      const statusMatch =
        filters.status === "all" || session.status === filters.status;
      return roleMatch && statusMatch;
    });
  };

  const sortSessions = (sessions) => {
    return [...sessions].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "name":
          aValue = (a.user?.name || "").toLowerCase();
          bValue = (b.user?.name || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "email":
          aValue = (a.user?.email || "").toLowerCase();
          bValue = (b.user?.email || "").toLowerCase();
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
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
  }, []);

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
  const filteredSessions = searchResults
    ? applyFilters(searchResults)
    : applyFilters(allSessions);
  const sessions = sortSessions(filteredSessions);

  // Calculate counts for each filter
  const getRoleCount = (role) => {
    if (role === "all") return allSessions.length;
    return allSessions.filter((session) => session.role === role).length;
  };

  const getStatusCount = (status) => {
    if (status === "all") return allSessions.length;
    return allSessions.filter((session) => session.status === status).length;
  };

  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };

  const showLogs = async (session) => {
    setSelectedSessionLogs(session);
    setShowLogsModal(true);
    setLoadingLogs(true);

    try {
      const response = await fetch(`/api/admin/session-logs/${session._id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedSessionLogs({
          ...session,
          logs: data.logs,
        });
      } else {
        console.error("Failed to fetch logs:", data.message);
        setSelectedSessionLogs({
          ...session,
          logs: [],
        });
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setSelectedSessionLogs({
        ...session,
        logs: [],
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 lg:gap-0">
            <div className="flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {brand.toUpperCase()} Sessions
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
                {searchResults
                  ? `Search results (${sessions.length})`
                  : `All sessions (${sessions.length})`}
              </p>
            </div>

            {/* Action Buttons Section */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={() => router.push(`/admin/${brand}/edit-profile`)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-200 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl"
              >
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => router.push(`/admin/${brand}/train`)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Train Chatbot</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
        {/* Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              Sort by:
            </span>
            <div className="flex gap-2 sm:gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="email">Email</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              >
                <option value="desc">
                  {sortBy === "createdAt"
                    ? "Newest First"
                    : sortBy === "name" || sortBy === "email"
                      ? "A-Z"
                      : "Descending"}
                </option>
                <option value="asc">
                  {sortBy === "createdAt"
                    ? "Oldest First"
                    : sortBy === "name" || sortBy === "email"
                      ? "Z-A"
                      : "Ascending"}
                </option>
              </select>
            </div>
          </div>

          {/* Send Email Button */}
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={sessions.length === 0}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>Send Email ({sessions.length})</span>
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Role Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Role:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  "all",
                  "job_seeker",
                  "recruiter",
                  brandContext.subdomain === "kavisha" ? "dating" : null,
                  "lead_journey",
                ]
                  .filter(Boolean)
                  .map((role) => (
                    <button
                      key={role}
                      onClick={() => setFilters((prev) => ({ ...prev, role }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                        filters.role === role
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <span>
                        {role === "all" ? "All" : role.replace("_", " ")}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          filters.role === role
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getRoleCount(role)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  "all",
                  "session initiated",
                  "completed",
                  "in progress",
                  "onboarded",
                ].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilters((prev) => ({ ...prev, status }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      filters.status === status
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        filters.status === status
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getStatusCount(status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {sessions.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sessions found
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters or search criteria.
              </p>
            </div>
          ) : (
            sessions.map((currentUserSession, idx) => (
              <div
                key={currentUserSession._id || idx}
                className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                          {(currentUserSession.user?.name || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                            {currentUserSession.user?.name || "Unknown User"}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {currentUserSession.user?.email || "No email"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {currentUserSession.role || "Unknown Role"}
                        </span>
                        {currentUserSession.assignedTo && (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {currentUserSession.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                    {currentUserSession.user?.email && (
                      <button
                        onClick={() => {
                          setSelectedSession(currentUserSession);
                          setShowIndividualEmailModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        Email
                      </button>
                    )}
                    {currentUserSession.user?._id && (
                      <button
                        onClick={() =>
                          openChatSession(
                            user?.id,
                            currentUserSession.user?._id
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        Chat
                      </button>
                    )}
                    <button
                      onClick={() => showLogs(currentUserSession)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Logs
                    </button>
                  </div>

                  {/* Status and Assignment Controls */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Status
                      </label>
                      <select
                        value={currentUserSession.status || ""}
                        onChange={(e) =>
                          updateSessionStatus(
                            currentUserSession._id,
                            e.target.value
                          )
                        }
                        disabled={updating[currentUserSession._id]}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">Select Status</option>
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {updating[currentUserSession._id] && (
                        <p className="mt-1 text-xs text-gray-500">
                          Updating...
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Assign to
                      </label>
                      <select
                        value={currentUserSession.assignedTo || ""}
                        onChange={(e) =>
                          assignSession(currentUserSession._id, e.target.value)
                        }
                        disabled={assigning[currentUserSession._id]}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                      >
                        <option value="">Unassigned</option>
                        {brandContext.admins?.map((admin) => (
                          <option key={admin} value={admin}>
                            {admin}
                          </option>
                        ))}
                      </select>
                      {assigning[currentUserSession._id] && (
                        <p className="mt-1 text-xs text-gray-500">
                          Assigning...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Session Details
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span
                          className={`ml-1 font-medium ${
                            currentUserSession.status === "completed"
                              ? "text-green-600"
                              : currentUserSession.status === "in-progress"
                                ? "text-blue-600"
                                : currentUserSession.status === "on hold"
                                  ? "text-yellow-600"
                                  : currentUserSession.status === "rejected"
                                    ? "text-red-600"
                                    : "text-gray-600"
                          }`}
                        >
                          {currentUserSession.status || "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Data:</span>
                        <span
                          className={`ml-1 font-medium ${
                            currentUserSession.allDataCollected
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {currentUserSession.allDataCollected
                            ? "Complete"
                            : "Incomplete"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Brand:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {currentUserSession.brand || "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          {new Date(
                            currentUserSession.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Summary
                    </h4>
                    {currentUserSession.chatSummary ? (
                      <>
                        <p
                          className={`text-xs sm:text-sm text-gray-600 leading-relaxed ${
                            !expandedSummaries[currentUserSession._id]
                              ? "line-clamp-3"
                              : ""
                          }`}
                        >
                          {currentUserSession.chatSummary}
                        </p>
                        {currentUserSession.chatSummary.length > 150 && (
                          <button
                            onClick={() =>
                              setExpandedSummaries((prev) => ({
                                ...prev,
                                [currentUserSession._id]:
                                  !prev[currentUserSession._id],
                              }))
                            }
                            className="text-blue-600 text-xs mt-1.5 sm:mt-2 hover:underline font-medium"
                          >
                            {expandedSummaries[currentUserSession._id]
                              ? "Show less"
                              : "Read more"}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-400 italic">
                        No chat summary available
                      </p>
                    )}
                  </div>
                </div>

                {/* Resume Info */}
                {currentUserSession.resumeSummary && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Resume Summary
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {currentUserSession.resumeSummary}
                    </p>
                    {currentUserSession.resumeFilename && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        {currentUserSession.resumeFilename}
                      </p>
                    )}
                  </div>
                )}

                {/* Title */}
                {currentUserSession.title && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      Title
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {currentUserSession.title}
                    </p>
                  </div>
                )}

                {/* Comment Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Admin Comment
                  </h4>
                  <textarea
                    value={currentUserSession.comment || ""}
                    onChange={(e) => {
                      const newComment = e.target.value;
                      // Update local state immediately for better UX
                      setData((prev) => ({
                        ...prev,
                        sessions: prev.sessions.map((s) =>
                          s._id === currentUserSession._id
                            ? { ...s, comment: newComment }
                            : s
                        ),
                      }));
                    }}
                    placeholder="Add a comment for this session..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm resize-none bg-gray-50"
                  />
                  <div className="flex justify-between items-center mt-2 sm:mt-3">
                    <button
                      onClick={() =>
                        updateSessionComment(
                          currentUserSession._id,
                          currentUserSession.comment || ""
                        )
                      }
                      disabled={commentUpdating[currentUserSession._id]}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {commentUpdating[currentUserSession._id]
                        ? "Saving..."
                        : "Save Comment"}
                    </button>
                    {commentUpdating[currentUserSession._id] && (
                      <p className="text-xs text-gray-500">Saving...</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                Send Email to {sessions.length} Users
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) =>
                      setEmailData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Enter email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    value={emailData.body}
                    onChange={(e) =>
                      setEmailData((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Enter your message here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <p>This email will be sent to {sessions.length} users:</p>
                  <ul className="mt-2 max-h-32 overflow-y-auto">
                    {sessions.slice(0, 10).map((session, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{session.user?.name || "Unknown"}</span>
                        <span className="text-gray-500">
                          {session.user?.email}
                        </span>
                      </li>
                    ))}
                    {sessions.length > 10 && (
                      <li className="text-gray-500">
                        ... and {sessions.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={handleSendEmail}
                  disabled={
                    sendingEmail ||
                    !emailData.subject.trim() ||
                    !emailData.body.trim()
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ subject: "", body: "" });
                    setEmailResults(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Email Results */}
              {emailResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Email Results:</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {emailResults.message}
                  </p>
                  <div className="text-sm">
                    <p>Total: {emailResults.results?.total}</p>
                    <p className="text-green-600">
                      Successful: {emailResults.results?.successful}
                    </p>
                    <p className="text-red-600">
                      Failed: {emailResults.results?.failed}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Individual Email Modal */}
        {showIndividualEmailModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
                Send Email to {selectedSession.user?.name || "User"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                {selectedSession.user?.email}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={individualEmailData.subject}
                    onChange={(e) =>
                      setIndividualEmailData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Enter email subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    value={individualEmailData.body}
                    onChange={(e) =>
                      setIndividualEmailData((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Enter your message here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={handleSendIndividualEmail}
                  disabled={
                    sendingIndividualEmail ||
                    !individualEmailData.subject.trim() ||
                    !individualEmailData.body.trim()
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {sendingIndividualEmail ? "Sending..." : "Send Email"}
                </button>
                <button
                  onClick={() => {
                    setShowIndividualEmailModal(false);
                    setIndividualEmailData({ subject: "", body: "" });
                    setSelectedSession(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {openChat && userA && userB && (
        <Livechat
          userA={userA}
          userB={userB}
          currentUserId={user?.id}
          onClose={() => setOpenChat(false)}
          connectionId={connectionId}
        />
      )}

      {/* Logs Modal */}
      {showLogsModal && selectedSessionLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                  {(selectedSessionLogs.user?.name || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    Chat Logs
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {selectedSessionLogs.user?.name || "Unknown User"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLogsModal(false);
                  setSelectedSessionLogs(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-2"
                aria-label="Close Logs"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <div className="text-gray-600 font-medium">
                      Loading chat logs...
                    </div>
                  </div>
                </div>
              ) : selectedSessionLogs.logs &&
                selectedSessionLogs.logs.length > 0 ? (
                <div className="space-y-4">
                  {selectedSessionLogs.logs.map((log, index) => (
                    <div
                      key={log._id || index}
                      className={`flex ${
                        log.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
                          log.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-800 border border-gray-200"
                        }`}
                      >
                        <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {log.message}
                        </div>
                        <div
                          className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${
                            log.role === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No chat logs available
                  </h4>
                  <p className="text-gray-500">
                    This session doesn't have any chat logs yet.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="font-medium">
                  Total Messages: {selectedSessionLogs.logs?.length || 0}
                </span>
                <span className="text-gray-400 hidden sm:inline">•</span>
                <span className="text-[10px] sm:text-sm truncate max-w-[200px] sm:max-w-none">
                  Session: {selectedSessionLogs._id}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-400">
                {selectedSessionLogs.logs?.length > 0 &&
                  `Last message: ${new Date(selectedSessionLogs.logs[selectedSessionLogs.logs.length - 1]?.createdAt).toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
