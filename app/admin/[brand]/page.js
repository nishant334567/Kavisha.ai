"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useBrandContext } from "../../context/brand/BrandContextProvider";

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
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [assigning, setAssigning] = useState({});
  const brandContext = useBrandContext();
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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    if (!isValidEmail(newAdminEmail)) {
      alert("Please enter a valid email address");
      return;
    }

    // Check if admin already exists in brand context
    const existingAdmins = brandContext.admins || [];
    if (existingAdmins.includes(newAdminEmail.trim().toLowerCase())) {
      alert("This admin already exists for this brand");
      return;
    }

    setAddingAdmin(true);
    try {
      const response = await fetch("/api/admin/add-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail.trim(), brand: brand }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          "Admin added successfully! They will receive an email notification."
        );
        setNewAdminEmail("");
        // Refresh brand context to update admin list
        if (brandContext.refreshBrandContext) {
          await brandContext.refreshBrandContext();
        }
      } else {
        alert(result.error || "Failed to add admin");
      }
    } catch (error) {
      console.error("Failed to add admin:", error);
      alert("Failed to add admin. Please try again.");
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <div className="h-screen bg-white p-6 overflow-y-auto">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {brand.toUpperCase()} Sessions
              </h1>
              <p className="mt-1 text-slate-600">
                {searchResults
                  ? `Search results (${sessions.length})`
                  : `All sessions (${sessions.length})`}
              </p>
            </div>

            {/* Add Admin Section */}
            <div className="flex gap-2 items-center">
              <input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Enter admin email..."
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <button
                onClick={handleAddAdmin}
                disabled={!isValidEmail(newAdminEmail) || addingAdmin}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {addingAdmin ? "Adding..." : "Add Admin"}
              </button>
            </div>
          </div>
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

        {/* Sort Controls */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="email">Email</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
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

        {/* Filter Buttons and Email Action */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Role Filter */}
            <div className="flex gap-1">
              <span className="text-sm text-gray-600 px-2 py-1">Role:</span>
              {["all", "job_seeker", "recruiter", "dating", "lead_journey"].map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => setFilters((prev) => ({ ...prev, role }))}
                    className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                      filters.role === role
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    <span>
                      {role === "all" ? "All" : role.replace("_", " ")}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        filters.role === role
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getRoleCount(role)}
                    </span>
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
                  className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                    filters.status === status
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <span>{status === "all" ? "All" : status}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
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

          {/* Send Email Button */}
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={sessions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            Send Email ({sessions.length})
          </button>
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
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {session.user?.name || "Unknown User"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {session.user?.email || "No email"}
                        </p>
                      </div>
                      {session.user?.email && (
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowIndividualEmailModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
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
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          Email
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {session.role || "Unknown Role"}
                      </span>
                      {session.assignedTo && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Assigned to: {session.assignedTo}
                        </span>
                      )}
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

                    {/* Assignment Dropdown */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Assign to:
                      </label>
                      <select
                        value={session.assignedTo || ""}
                        onChange={(e) =>
                          assignSession(session._id, e.target.value)
                        }
                        disabled={assigning[session._id]}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Unassigned</option>
                        {brandContext.admins?.map((admin) => (
                          <option key={admin} value={admin}>
                            {admin}
                          </option>
                        ))}
                      </select>
                      {assigning[session._id] && (
                        <span className="ml-2 text-xs text-gray-500">
                          Assigning...
                        </span>
                      )}
                    </div>
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

                {/* Comment Section */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">
                    Admin Comment
                  </h4>
                  <textarea
                    value={session.comment || ""}
                    onChange={(e) => {
                      const newComment = e.target.value;
                      // Update local state immediately for better UX
                      setData((prev) => ({
                        ...prev,
                        sessions: prev.sessions.map((s) =>
                          s._id === session._id
                            ? { ...s, comment: newComment }
                            : s
                        ),
                      }));
                    }}
                    placeholder="Add a comment for this session..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <button
                      onClick={() =>
                        updateSessionComment(session._id, session.comment || "")
                      }
                      disabled={commentUpdating[session._id]}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {commentUpdating[session._id]
                        ? "Saving..."
                        : "Save Comment"}
                    </button>
                    {commentUpdating[session._id] && (
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSendEmail}
                  disabled={
                    sendingEmail ||
                    !emailData.subject.trim() ||
                    !emailData.body.trim()
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </button>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ subject: "", body: "" });
                    setEmailResults(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Send Email to {selectedSession.user?.name || "User"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSendIndividualEmail}
                  disabled={
                    sendingIndividualEmail ||
                    !individualEmailData.subject.trim() ||
                    !individualEmailData.body.trim()
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingIndividualEmail ? "Sending..." : "Send Email"}
                </button>
                <button
                  onClick={() => {
                    setShowIndividualEmailModal(false);
                    setIndividualEmailData({ subject: "", body: "" });
                    setSelectedSession(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
