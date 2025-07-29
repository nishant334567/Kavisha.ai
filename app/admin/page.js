"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Admin() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [filteredUser, setFilteredUser] = useState([]);
  const [jobSeekerCount, setJobseekercount] = useState(0);
  const [recruiterCount, setRecruiterCount] = useState(0);
  const [matches, setMatches] = useState(0);
  const [connections, setConnections] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userChats, setUserChats] = useState([]);
  const [showChats, setShowChats] = useState(false);
  const [sessionMatches, setSessionMatches] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [allConnections, setAllConnections] = useState([]);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [incomingConnections, setIncomingConnections] = useState([]);
  const [showIncomingConnections, setShowIncomingConnections] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.isAdmin) {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/overview");
        const data = await res.json();

        if (data.success) {
          setTotalUsers(data.counts.totalUsers);
          setJobseekercount(data.counts.jobSeekerCount);
          setRecruiterCount(data.counts.recruiterCount);
          setMatches(data.counts.matchesCount);
          setConnections(data.counts.connectionsCount);
          setUsers(data.users);
          setFilteredUser(data.users);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.isAdmin) {
      fetchData();
    }
  }, [session]);

  const filterUser = (userType) => {
    setFilter(userType);
    const filterUsers = users.filter((item) =>
      userType === "all" ? true : item.profileType === userType
    );
    setFilteredUser(filterUsers);
  };

  const fetchUserChats = async (userId) => {
    console.log("User id ", userId);
    try {
      const res = await fetch(`/api/admin/fetch-chats/${userId}`);
      const data = await res.json();

      if (data.success) {
        setUserChats(data.sessions);
        setSelectedUser(data.userId);
        setShowChats(true);
      }
    } catch (error) {
      console.error("Error fetching user chats:", error);
    }
  };

  const fetchSessionMatches = async (sessionId) => {
    try {
      const res = await fetch(`/api/admin/fetch-matches/${sessionId}`);
      const data = await res.json();

      if (data.success) {
        setSessionMatches(data.matches);
        setSelectedSessionId(sessionId);
        setShowMatches(true);
      }
    } catch (error) {
      console.error("Error fetching session matches:", error);
    }
  };

  const fetchAllMatches = async () => {
    try {
      const res = await fetch("/api/admin/all-matches");
      const data = await res.json();

      if (data.success) {
        setAllMatches(data.matches);
        setShowAllMatches(true);
      }
    } catch (error) {
      console.error("Error fetching all matches:", error);
    }
  };

  const fetchAllConnections = async () => {
    try {
      const res = await fetch("/api/admin/all-connections");
      const data = await res.json();

      if (data.success) {
        setAllConnections(data.connections);
        setShowAllConnections(true);
      }
    } catch (error) {
      console.error("Error fetching all connections:", error);
    }
  };

  const fetchIncomingConnections = async (sessionId) => {
    try {
      const res = await fetch(`/api/admin/incoming-connections/${sessionId}`);
      const data = await res.json();

      if (data.success) {
        setIncomingConnections(data.connections);
        setShowIncomingConnections(true);
      }
    } catch (error) {
      console.error("Error fetching incoming connections:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Welcome, {session.user.name}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Job Seekers</p>
            <p className="text-2xl font-bold text-green-600">
              {jobSeekerCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Recruiters</p>
            <p className="text-2xl font-bold text-purple-600">
              {recruiterCount}
            </p>
          </div>
          <div
            className="bg-white p-4 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={fetchAllMatches}
          >
            <p className="text-sm text-gray-600">Matches</p>
            <p className="text-2xl font-bold text-yellow-600">{matches}</p>
          </div>
          <div
            className="bg-white p-4 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={fetchAllConnections}
          >
            <p className="text-sm text-gray-600">Connections</p>
            <p className="text-2xl font-bold text-blue-600">{connections}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded border mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => filterUser("all")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "all"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => filterUser("job_seeker")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "job_seeker"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Job Seekers
            </button>
            <button
              onClick={() => filterUser("recruiter")}
              className={`px-3 py-1 rounded text-sm ${
                filter === "recruiter"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Recruiters
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded border">
          <div className="p-4 border-b">
            <h3 className="font-medium">Users ({filteredUser.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {filteredUser.map((usr, index) => (
              <div
                key={index}
                onClick={() => fetchUserChats(usr.id)}
                className="p-4 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      usr.profileType === "job_seeker"
                        ? "bg-green-500"
                        : "bg-purple-500"
                    }`}
                  ></div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      usr.profileType === "job_seeker"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {usr.profileType === "job_seeker"
                      ? "Job Seeker"
                      : "Recruiter"}
                  </span>
                </div>
                <h4 className="font-medium mb-1">{usr.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{usr.email}</p>
                {usr.sessions && (
                  <p className="text-xs text-gray-500">
                    {usr.sessions.length} session
                    {usr.sessions.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Chats Modal */}
        {showChats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">User Chats ({userChats.length})</h3>
                <button
                  onClick={() => setShowChats(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {userChats.map((session, index) => (
                  <div key={index} className="border rounded p-4 mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">
                        {session.title || `Session ${index + 1}`}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchSessionMatches(session.sessionId);
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Matches
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchIncomingConnections(session.sessionId);
                          }}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                        >
                          Incoming
                        </button>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            session.role === "job_seeker"
                              ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {session.role}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <p>
                        Started:{" "}
                        {new Date(session.startedAt).toLocaleDateString()}
                      </p>
                      <p>
                        Last Activity:{" "}
                        {new Date(session.lastActivity).toLocaleDateString()}
                      </p>
                      <p>Messages: {session.messageCount}</p>
                    </div>
                    {session.logs && session.logs.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">
                          Recent Messages:
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                          {session.logs.map((log, logIndex) => (
                            <div
                              key={logIndex}
                              className="text-xs bg-gray-50 p-2 rounded"
                            >
                              <span
                                className={`font-medium ${
                                  log.role === "user"
                                    ? "text-blue-600"
                                    : "text-green-600"
                                }`}
                              >
                                {log.role}:
                              </span>
                              <span className="ml-1">
                                {log.message.substring(0, 150)}...
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Session Matches Modal */}
        {showMatches && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  Session Matches ({sessionMatches.length})
                </h3>
                <button
                  onClick={() => setShowMatches(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {sessionMatches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No matches found for this session.
                  </p>
                ) : (
                  sessionMatches.map((match, index) => (
                    <div key={index} className="border rounded p-4 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Match #{index + 1}</h4>
                          <p className="text-xs text-gray-500">
                            From: {match.fromUser?.name} → To:{" "}
                            {match.toUser?.name}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                          {match.matchPercentage || "N/A"}% Match
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <p className="font-medium text-xs text-gray-500">
                              FROM:
                            </p>
                            <p>Name: {match.fromUser?.name}</p>
                            <p>Email: {match.fromUser?.email}</p>
                            <p>Session: {match.fromUser?.sessionTitle}</p>
                            <p>Role: {match.fromUser?.sessionRole}</p>
                          </div>
                          <div>
                            <p className="font-medium text-xs text-gray-500">
                              TO:
                            </p>
                            <p>Name: {match.toUser?.name}</p>
                            <p>Email: {match.toUser?.email}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p>Contacted: {match.contacted ? "Yes" : "No"}</p>
                          <p>
                            Date:{" "}
                            {new Date(match.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {match.matchingReason && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">
                            Matching Reason:
                          </p>
                          <p className="text-sm bg-gray-50 p-2 rounded">
                            {match.matchingReason}
                          </p>
                        </div>
                      )}
                      {match.chatSummary && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Chat Summary:
                          </p>
                          <p className="text-sm bg-gray-50 p-2 rounded">
                            {match.chatSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Incoming Connections Modal */}
        {showIncomingConnections && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  Incoming Connection Requests ({incomingConnections.length})
                </h3>
                <button
                  onClick={() => setShowIncomingConnections(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {incomingConnections.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No incoming connection requests found for this session.
                  </p>
                ) : (
                  incomingConnections.map((connection, index) => (
                    <div key={index} className="border rounded p-4 mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">Request #{index + 1}</h4>
                          <p className="text-xs text-gray-500">
                            From: {connection.sender?.name} → To:{" "}
                            {connection.receiver?.name}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            connection.emailSent
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {connection.emailSent ? "Email Sent" : "Pending"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <p className="font-medium text-xs text-gray-500">
                              FROM (Request Sender):
                            </p>
                            <p>Name: {connection.sender?.name}</p>
                            <p>Email: {connection.sender?.email}</p>
                            <p>Session: {connection.sender?.sessionTitle}</p>
                            <p>Role: {connection.sender?.sessionRole}</p>
                          </div>
                          <div>
                            <p className="font-medium text-xs text-gray-500">
                              TO (This Session):
                            </p>
                            <p>Name: {connection.receiver?.name}</p>
                            <p>Email: {connection.receiver?.email}</p>
                            <p>Session: {connection.receiver?.sessionTitle}</p>
                            <p>Role: {connection.receiver?.sessionRole}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p>
                            Date:{" "}
                            {new Date(
                              connection.createdAt
                            ).toLocaleDateString()}
                          </p>
                          <p>
                            Email Sent: {connection.emailSent ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                      {connection.message && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Message:</p>
                          <div className="text-sm bg-gray-50 p-2 rounded border">
                            {connection.message}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Matches Modal */}
        {showAllMatches && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  All Matches ({allMatches.length})
                </h3>
                <button
                  onClick={() => setShowAllMatches(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[70vh]">
                {allMatches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No matches found.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allMatches.map((match, index) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">Match #{index + 1}</h4>
                            <p className="text-xs text-gray-500">
                              From: {match.fromUser?.name} → To:{" "}
                              {match.toUser?.name}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                            {match.matchPercentage || "N/A"}% Match
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <p className="font-medium text-xs text-gray-500">
                                FROM:
                              </p>
                              <p>Name: {match.fromUser?.name}</p>
                              <p>Email: {match.fromUser?.email}</p>
                              <p>Session: {match.fromUser?.sessionTitle}</p>
                              <p>Role: {match.fromUser?.sessionRole}</p>
                            </div>
                            <div>
                              <p className="font-medium text-xs text-gray-500">
                                TO:
                              </p>
                              <p>Name: {match.toUser?.name}</p>
                              <p>Email: {match.toUser?.email}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <p>Contacted: {match.contacted ? "Yes" : "No"}</p>
                            <p>
                              Date:{" "}
                              {new Date(match.createdAt).toLocaleDateString()}
                            </p>
                            <p>Session ID: {match.sessionId}</p>
                          </div>
                        </div>
                        {match.matchingReason && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">
                              Matching Reason:
                            </p>
                            <p className="text-sm bg-gray-50 p-2 rounded">
                              {match.matchingReason}
                            </p>
                          </div>
                        )}
                        {match.chatSummary && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Chat Summary:
                            </p>
                            <p className="text-sm bg-gray-50 p-2 rounded">
                              {match.chatSummary}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* All Connections Modal */}
        {showAllConnections && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  All Connections ({allConnections.length})
                </h3>
                <button
                  onClick={() => setShowAllConnections(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[70vh]">
                {allConnections.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No connections found.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allConnections.map((connection, index) => (
                      <div key={index} className="border rounded p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">
                              Connection #{index + 1}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {connection.sender?.name} →{" "}
                              {connection.receiver?.name}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              connection.emailSent
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {connection.emailSent ? "Email Sent" : "Pending"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <p className="font-medium text-xs text-gray-500">
                                FROM:
                              </p>
                              <p>Name: {connection.sender?.name}</p>
                              <p>Email: {connection.sender?.email}</p>
                              <p>Session: {connection.sender?.sessionTitle}</p>
                              <p>Role: {connection.sender?.sessionRole}</p>
                            </div>
                            <div>
                              <p className="font-medium text-xs text-gray-500">
                                TO:
                              </p>
                              <p>Name: {connection.receiver?.name}</p>
                              <p>Email: {connection.receiver?.email}</p>
                              <p>
                                Session: {connection.receiver?.sessionTitle}
                              </p>
                              <p>Role: {connection.receiver?.sessionRole}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <p>
                              Date:{" "}
                              {new Date(
                                connection.createdAt
                              ).toLocaleDateString()}
                            </p>
                            <p>
                              Email Sent: {connection.emailSent ? "Yes" : "No"}
                            </p>
                          </div>
                        </div>
                        {connection.message && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-1">
                              Message:
                            </p>
                            <div className="text-sm bg-gray-50 p-2 rounded border">
                              {connection.message}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
