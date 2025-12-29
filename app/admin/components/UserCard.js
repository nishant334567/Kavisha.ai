"use client";
import { useState, useEffect } from "react";
import { formatToIST } from "@/app/utils/formatToIST";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Dropdown from "./AdminDropdown";
import { ChevronDown } from "lucide-react";

export default function UserCard({
  user,
  setShowLogsModal,
  setSelectedSessionLogs,
  openChatSession,
}) {
  const brandContext = useBrandContext();
  const { user: adminUser } = useFirebaseSession();
  const [selectedChatSession, setSelectedChatSession] = useState("");
  const [assigning, setAssigning] = useState({});
  const [commentUpdating, setCommentUpdating] = useState({});
  const [comment, setComment] = useState("");
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  useEffect(() => {
    setSelectedChatSession(user?.sessions[0]);
  }, [user?.sessions]);

  useEffect(() => {
    if (selectedChatSession) {
      setComment(selectedChatSession.comment || "");
    }
  }, [selectedChatSession]);

  const assignSession = async (sessionId, assignedTo) => {
    setAssigning((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const response = await fetch(`/api/admin/assign-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, assignedTo }),
      });

      if (response.ok) {
        const data = await response.json();
        // Use the updated session from API response if available
        const updatedAssignedTo = data?.session?.assignedTo || assignedTo;
        // Update local session state
        setSelectedChatSession((prev) =>
          prev?._id === sessionId
            ? { ...prev, assignedTo: updatedAssignedTo }
            : prev
        );
        // Update user sessions
        user.sessions = user.sessions.map((session) =>
          session._id === sessionId
            ? { ...session, assignedTo: updatedAssignedTo }
            : session
        );
      }
    } catch (error) {
      console.error("Failed to assign session:", error);
    } finally {
      setAssigning((prev) => ({ ...prev, [sessionId]: false }));
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
        // Update local session state
        setSelectedChatSession((prev) =>
          prev?._id === sessionId ? { ...prev, comment: comment } : prev
        );
        // Update user sessions
        user.sessions = user.sessions.map((session) =>
          session._id === sessionId ? { ...session, comment: comment } : session
        );
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setCommentUpdating((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const showLogs = async (id) => {
    setShowLogsModal(true);

    try {
      const response = await fetch(`/api/admin/session-logs/${id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedSessionLogs({
          _id: id,
          user: {
            name: user.name,
            email: user.email,
          },
          logs: data.logs || [],
        });
      } else {
        setSelectedSessionLogs({
          _id: id,
          user: {
            name: user.name,
            email: user.email,
          },
          logs: [],
        });
      }
    } catch (error) {
      setSelectedSessionLogs({
        _id: id,
        user: {
          name: user.name,
          email: user.email,
        },
        logs: [],
      });
    }
  };

  return (
    <>
      <div className="p-4 md:m-4 flex flex-col md:flex-row justify-between h-full md:max-h-[200px] md:shadow-md bg-white mx-auto md:rounded-lg border border-gray-200">
        {/* Mobile Layout */}
        <div className="w-full md:hidden flex flex-col gap-4">
          {/* Name and Contact Button Row */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-baloo text-[#42476D] mb-1 text-2xl">
                {user.name}
              </p>
              <p className="text-xs text-[#898989]">{user?.email}</p>
            </div>
            <button
              onClick={() => openChatSession(adminUser?.id, user?.userId)}
              className="px-3 py-1.5 rounded-lg bg-[#7981C2] text-white text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              Contact
            </button>
          </div>

          {/* Assign to Dropdown */}
          <div className="relative">
            <button
              className="w-full bg-[#EEF0FE] border border-[#BFC4E5] rounded-2xl py-1 px-2 text-sm text-gray-900 flex items-center justify-between"
              onClick={() => setShowAdminDropdown((prev) => !prev)}
            >
              <span>{selectedChatSession?.assignedTo || "Assign to"}</span>
              <ChevronDown />
            </button>
            {showAdminDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50">
                <Dropdown
                  key={selectedChatSession?._id} // Force re-render when session changes
                  options={["Unassigned", ...(brandContext?.admins || [])]}
                  selectedValue={selectedChatSession?.assignedTo || ""}
                  onProceed={(assignedTo) => {
                    if (selectedChatSession?._id) {
                      // Convert "Unassigned" to empty string
                      const value =
                        assignedTo === "Unassigned" ? "" : assignedTo;
                      assignSession(selectedChatSession._id, value);
                      setShowAdminDropdown(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Comment Section */}
          <div className="bg-[#EEF0FE] p-1 rounded-md flex flex-col">
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full border outline-none resize-none p-2 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-sm bg-white"
            />
            <div className="flex justify-end mt-1">
              <button
                onClick={() =>
                  updateSessionComment(selectedChatSession?._id, comment)
                }
                disabled={commentUpdating[selectedChatSession?._id]}
                className="px-3 py-1 rounded-lg bg-white text-gray-700 text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                {commentUpdating[selectedChatSession?._id]
                  ? "Saving..."
                  : "Comment"}
              </button>
            </div>
          </div>

          {/* Total Messages and Cost */}
          <div className="flex justify-between text-sm font-baloo">
            <p>
              Total Messages:{" "}
              {user.sessions?.reduce(
                (sum, session) => sum + (session.messageCount || 0),
                0
              ) || 0}
            </p>
            <p>
              Total Cost: Rs.{" "}
              {(
                user.sessions?.reduce(
                  (sum, session) => sum + (session.totalCost || 0),
                  0
                ) || 0
              ).toFixed(2)}
            </p>
          </div>

          {/* All Chats Dropdown */}
          {selectedChatSession && (
            <div className="relative">
              <button
                className="w-full bg-[#EEF0FE] border border-[#BFC4E5] rounded-2xl py-1 px-2 text-sm text-gray-900 flex items-center justify-between"
                onClick={() => setShowSessionDropdown((prev) => !prev)}
              >
                <span>
                  {selectedChatSession?.title ||
                    `Chat ${user.sessions.findIndex((s) => s._id === selectedChatSession?._id) + 1 || 1}`}
                </span>
                <ChevronDown />
              </button>
              {showSessionDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {user.sessions.map((item, index) => {
                    const isSelected = selectedChatSession?._id === item._id;
                    return (
                      <button
                        key={index}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 transition ${
                          isSelected
                            ? "bg-gray-100 text-gray-900 font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setSelectedChatSession(item);
                          setShowSessionDropdown(false);
                        }}
                      >
                        {item?.title || `Chat ${index + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chat Summary */}
          {selectedChatSession && (
            <div>
              <p className="font-bold text-[#1D008F] mb-2">Chat summary</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                {selectedChatSession.chatSummary || "Summary Not Available"}
              </p>
              <div className="flex justify-end">
                <button
                  className="text-xs text-gray-700"
                  onClick={() => showLogs(selectedChatSession?._id)}
                >
                  View chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex md:w-[50%] gap-4">
          <div className="w-[35%] flex-shrink-0">
            <p className="font-baloo text-[#42476D] mb-1 text-2xl">
              {user.name}
            </p>
            <p className="text-xs text-[#898989] mb-2">{user?.email}</p>
            <button className="w-full px-3 py-1.5 rounded-lg bg-[#7981C2] text-white text-xs font-medium hover:bg-purple-700 transition-colors mb-3">
              Contact
            </button>
            <div className="space-y-0.5 font-medium">
              <p className="font-baloo">
                Total Messages:{" "}
                {user.sessions?.reduce(
                  (sum, session) => sum + (session.messageCount || 0),
                  0
                ) || 0}
              </p>
              <p className="font-baloo">
                Total Cost: Rs.{" "}
                {(
                  user.sessions?.reduce(
                    (sum, session) => sum + (session.totalCost || 0),
                    0
                  ) || 0
                ).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="w-[35%] flex-shrink-0 relative">
            <button
              className="w-full bg-[#EEF0FE] border border-[#BFC4E5] rounded-2xl py-1 px-2 text-sm text-gray-900 flex items-center justify-between"
              onClick={() => setShowAdminDropdown((prev) => !prev)}
            >
              <span>{selectedChatSession?.assignedTo || "Assign to"}</span>
              <ChevronDown />
            </button>
            {showAdminDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50">
                <Dropdown
                  key={selectedChatSession?._id} // Force re-render when session changes
                  options={["Unassigned", ...(brandContext?.admins || [])]}
                  selectedValue={selectedChatSession?.assignedTo || ""}
                  onProceed={(assignedTo) => {
                    if (selectedChatSession?._id) {
                      // Convert "Unassigned" to empty string
                      const value =
                        assignedTo === "Unassigned" ? "" : assignedTo;
                      assignSession(selectedChatSession._id, value);
                      setShowAdminDropdown(false);
                    }
                  }}
                />
              </div>
            )}
            <div className="bg-[#EEF0FE] p-1 rounded-md flex flex-col mt-4">
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full border outline-none resize-none p-2 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500 text-sm bg-white"
              />
              <div className="flex justify-end mt-1">
                <button
                  onClick={() =>
                    updateSessionComment(selectedChatSession?._id, comment)
                  }
                  disabled={commentUpdating[selectedChatSession?._id]}
                  className="px-3 py-1 rounded-lg bg-white text-gray-700 text-xs font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  {commentUpdating[selectedChatSession?._id]
                    ? "Saving..."
                    : "Comment"}
                </button>
              </div>
            </div>
          </div>
          <div className="w-[30%] flex flex-col gap-1.5 overflow-y-auto scrollbar-none min-w-0">
            {user.sessions.map((item, index) => {
              const isSelected = selectedChatSession?._id === item._id;
              return (
                <button
                  key={index}
                  className={`text-xs w-full text-left px-2.5 py-1.5 transition shadow-sm ${
                    isSelected ? "font-bold " : "font-light "
                  }`}
                  onClick={() => setSelectedChatSession(item)}
                >
                  {item?.title || `Chat ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>
        {selectedChatSession && (
          <div className="hidden md:flex md:w-[50%] flex-col min-w-0 md:px-4">
            <p className="font-bold text-[#1D008F] mb-2 mt-1">Summary</p>
            <div className="flex-1 overflow-y-auto scrollbar-none pr-2">
              <p className="font-commissioner text-xs font-extralight leading-relaxed">
                {selectedChatSession.chatSummary || "Summary Not Available"}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                className="text-xs"
                onClick={() => showLogs(selectedChatSession?._id)}
              >
                View chat
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
