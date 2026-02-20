"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useBrandContext } from "../../context/brand/BrandContextProvider";
import Livechat from "../../components/LiveChat";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { useRouter } from "next/navigation";
import UserSessionDetail from "../components/UserSessionDetail";
import AdminLogsModal from "../components/AdminLogsModal";
import EmailModal from "../components/EmailModal";
import { Sparkles, Mail, MessageCircle, FileText, Check } from "lucide-react";
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
        setSelectedSessionLogs({
          ...session,
          logs: [],
        });
      }
    } catch (error) {
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
                onClick={() => router.push(`/admin/${brand}/train/v2`)}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
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
            <Mail className="w-4 h-4" />
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
                  "friends",
                  "lead_journey",
                  "pitch_to_investor",
                ]
                  .filter(Boolean)
                  .map((role) => (
                    <button
                      key={role}
                      onClick={() => setFilters((prev) => ({ ...prev, role }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${filters.role === role
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                        }`}
                    >
                      <span>
                        {role === "all" ? "All" : role.replace("_", " ")}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${filters.role === role
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
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${filters.status === status
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                      }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${filters.status === status
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
                <FileText className="w-12 h-12 text-gray-400" />
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
                        {(Array.isArray(currentUserSession.assignedTo) ? currentUserSession.assignedTo.length : currentUserSession.assignedTo) && (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {Array.isArray(currentUserSession.assignedTo) ? currentUserSession.assignedTo.join(", ") : currentUserSession.assignedTo}
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
                        <Mail className="w-3.5 h-3.5" />
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
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </button>
                    )}
                    <button
                      onClick={() => showLogs(currentUserSession)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
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
                        value={Array.isArray(currentUserSession.assignedTo) ? currentUserSession.assignedTo[0] ?? "" : (currentUserSession.assignedTo || "")}
                        onChange={(e) =>
                          assignSession(currentUserSession._id, e.target.value ? [e.target.value] : [])
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
                  <UserSessionDetail
                    expandSummaries={expandedSummaries}
                    setExpandedSummaries={setExpandedSummaries}
                    currentUserSession={currentUserSession}
                  />
                </div>

                {/* Resume Info */}
                {currentUserSession.resumeSummary && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Resume Summary
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      {currentUserSession.resumeSummary}
                    </p>
                    {currentUserSession.resumeFilename && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {currentUserSession.resumeFilename}
                      </p>
                    )}
                  </div>
                )}

                {/* Comment Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
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
                      <Check className="w-3.5 h-3.5" />
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

        {/* Bulk Email Modal */}
        {showEmailModal && (
          <EmailModal
            recipients={sessions
              .map((s) => ({ email: s.user?.email, name: s.user?.name }))
              .filter((r) => r.email)}
            emailData={emailData}
            setEmailData={setEmailData}
            onSend={handleSendEmail}
            sending={sendingEmail}
            onClose={() => {
              setShowEmailModal(false);
              setEmailData({ subject: "", body: "" });
              setEmailResults(null);
            }}
            emailResults={emailResults}
          />
        )}

        {/* Individual Email Modal */}
        {showIndividualEmailModal && selectedSession && (
          <EmailModal
            recipients={[
              {
                email: selectedSession.user?.email,
                name: selectedSession.user?.name,
              },
            ].filter((r) => r.email)}
            emailData={individualEmailData}
            setEmailData={setIndividualEmailData}
            onSend={handleSendIndividualEmail}
            sending={sendingIndividualEmail}
            onClose={() => {
              setShowIndividualEmailModal(false);
              setIndividualEmailData({ subject: "", body: "" });
              setSelectedSession(null);
            }}
          />
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
        <AdminLogsModal
          selectedSessionLogs={selectedSessionLogs}
          setShowLogsModal={setShowLogsModal}
          setSelectedSessionLogs={setSelectedSessionLogs}
          brand={brand}
        />
      )}
    </div>
  );
}
