"use client";
import { useState, useEffect } from "react";
import { formatToIST } from "@/app/utils/formatToIST";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function UserCard({
  user,
  setShowLogsModal,
  setSelectedSessionLogs,
}) {
  const brandContext = useBrandContext();
  const [selectedChatSession, setSelectedChatSession] = useState("");
  const [assigning, setAssigning] = useState({});
  const [commentUpdating, setCommentUpdating] = useState({});
  const [comment, setComment] = useState("");

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
        // Update local session state
        setSelectedChatSession((prev) =>
          prev?._id === sessionId ? { ...prev, assignedTo: assignedTo } : prev
        );
        // Update user sessions
        user.sessions = user.sessions.map((session) =>
          session._id === sessionId
            ? { ...session, assignedTo: assignedTo }
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
      <div className="p-4 m-4 flex justify-evenly h-[150px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] bg-white mx-auto rounded-md">
        <div className="w-[50%] flex">
          <div className="flex w-[70%] gap-2">
            <div className="w-[40%]">
              <p className="font-semibold text-sm">{user.name}</p>
              <p className="text-[10px] text-gray-500">{user?.email}</p>
            </div>
            <div className="w-[60%]">
              <p className="text-sm font-bold">Assign To: </p>
              <select
                value={selectedChatSession?.assignedTo || ""}
                onChange={(e) =>
                  assignSession(selectedChatSession?._id, e.target.value)
                }
                disabled={assigning[selectedChatSession?._id]}
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Unassigned</option>
                {brandContext.admins?.map((admin) => (
                  <option key={admin} value={admin}>
                    {admin}
                  </option>
                ))}
              </select>
              <div className="flex justify-between my-2">
                <p className="text-sm font-semibold">Comment</p>
                <button
                  onClick={() =>
                    updateSessionComment(selectedChatSession?._id, comment)
                  }
                  disabled={commentUpdating[selectedChatSession?._id]}
                  className="px-1 rounded-sm bg-slate-500 text-[10px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commentUpdating[selectedChatSession?._id]
                    ? "Saving..."
                    : "Save Comment"}
                </button>
              </div>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full border-0 outline-none resize-none p-2 rounded shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] focus:ring-0"
              />
            </div>
          </div>
          <div className="w-[1px] h-full bg-gray-300 mx-4"></div>
          <div className="flex-[1] flex flex-col gap-1 overflow-y-auto scrollbar-none items-start">
            {user.sessions.map((item, index) => {
              const isSelected = selectedChatSession?._id === item._id;
              return (
                <div key={index} className="w-full">
                  <button
                    className={`w-full text-left px-3 py-1 rounded border transition ${
                      isSelected
                        ? "bg-gray-600 text-gray-50"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedChatSession(item)}
                  >
                    <div className="text-sm">
                      {item?.title?.length > 15
                        ? item.title?.slice(0, 15) + `...`
                        : item?.title || `Session ${index + 1}`}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${isSelected ? "text-gray-50" : "text-gray-600"} `}
                    >
                      {formatToIST(item.updatedAt)}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-[1px] h-full bg-gray-300 mx-4"></div>
        {selectedChatSession && (
          <div className="relative w-[50%]">
            <div className="absolute top-0 -right-0">
              <button
                className="text-xs underline"
                onClick={() => showLogs(selectedChatSession?._id)}
              >
                View Chat
              </button>
            </div>
            <p className="font-bold">Chat Summary: </p>
            <div className="h-[80%] overflow-y-auto scrollbar-none">
              <p className="text-xs text-gray-700  ">
                {selectedChatSession.chatSummary || "Summary Not Available"}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
