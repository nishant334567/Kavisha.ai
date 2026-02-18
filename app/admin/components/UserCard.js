"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { formatToIST } from "@/app/utils/formatToIST";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ChevronDown, MessageCircle, Clock, IndianRupee, MessagesSquare, ArrowUpDown, MessageCircleMore, ArrowRight } from "lucide-react";

export default function UserCard({
  user,
  setShowLogsModal,
  setSelectedSessionLogs,
  openChatSession,
  onOpenSessionView,
  onOpenComments,
  onOpenAssign,
}) {
  const brandContext = useBrandContext();
  const { user: adminUser } = useFirebaseSession();
  const [selectedChatSession, setSelectedChatSession] = useState("");
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortingType, setSortingType] = useState("messages");
  const [sortingOrder, setSortingOrder] = useState("desc");
  const sessionDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  const sortedSessions = useMemo(() => {
    const list = [...(user?.sessions || [])];
    const asc = sortingOrder === "asc";
    if (sortingType === "messages") {
      list.sort((a, b) =>
        asc
          ? (a.messageCount || 0) - (b.messageCount || 0)
          : (b.messageCount || 0) - (a.messageCount || 0)
      );
    }
    if (sortingType === "lastUpdated") {
      list.sort((a, b) => {
        const tA = new Date(a.updatedAt || 0).getTime();
        const tB = new Date(b.updatedAt || 0).getTime();
        return asc ? tA - tB : tB - tA;
      });
    }
    return list;
  }, [user?.sessions, sortingType, sortingOrder]);

  useEffect(() => {
    setSelectedChatSession(sortedSessions[0]);
  }, [user?.sessions, sortingType, sortingOrder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target)) {
        setShowSessionDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    if (showSessionDropdown || showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSessionDropdown, showSortDropdown]);

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
      <div >
        {/* Mobile Layout */}
        <div className="w-full md:hidden flex flex-col gap-4">
          {/* Name and Contact Button Row */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-baloo text-[#42476D] mb-1 text-2xl font-bold">
                {user.name}
              </p>
              <p className="text-xs text-[#898989] break-words">
                {user?.email}
              </p>
            </div>
            <button
              onClick={() => openChatSession(adminUser?.id, user?.userId)}
              className="px-3 py-1.5 rounded-lg bg-[#004A4E] text-white text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              Contact
            </button>
          </div>

          {/* Total Messages and Cost */}
          <div className="flex items-center gap-3 text-xs text-[#42476D]">
            <span className="flex items-center gap-1">
              <MessagesSquare className="w-4 h-4 text-[#7981C2] shrink-0" aria-hidden />
              <span>{user.sessions?.reduce((sum, s) => sum + (s.messageCount || 0), 0) || 0}</span>
            </span>
            <span className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-[#7981C2] shrink-0" aria-hidden />
              <span>{((user.sessions?.reduce((sum, s) => sum + (s.totalCost || 0), 0) || 0)).toFixed(2)}</span>
            </span>
          </div>

          {/* Sort chats (mobile) */}
          {user.sessions?.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center">
                <ArrowUpDown className="w-4 h-4 text-[#7981C2]" aria-label="Sort" />
              </div>
              <div>
                <select
                  value={`${sortingType}-${sortingOrder}`}
                  onChange={(e) => {
                    const [type, order] = e.target.value.split("-");
                    setSortingType(type);
                    setSortingOrder(order);
                  }}
                  className="text-xs border border-[#BFC4E5] rounded-lg bg-[#EEF0FE] px-2 py-1.5 text-gray-900"
                >
                  <option value="messages-desc">Most messages first</option>
                  <option value="messages-asc">Fewest messages first</option>
                  <option value="lastUpdated-desc">Newest first</option>
                  <option value="lastUpdated-asc">Oldest first</option>
                </select>
              </div>
            </div>
          )}

          {/* All Chats Dropdown */}
          {selectedChatSession && (
            <div className="relative" ref={sessionDropdownRef}>
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto p-1 flex flex-col gap-1">
                  {sortedSessions.map((item, index) => {
                    const isSelected = selectedChatSession?._id === item._id;
                    return (
                      <button
                        key={item._id ?? index}
                        className={`w-full text-left px-3 py-1.5 rounded-md border text-sm transition cursor-pointer ${isSelected
                          ? "bg-[#EEF0FE] border-[#BFC4E5] text-gray-900 font-semibold shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                        onClick={() => {
                          setSelectedChatSession(item);
                          setShowSessionDropdown(false);
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900 truncate">{item?.title || `Chat ${index + 1}`}</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 text-gray-400 shrink-0" aria-hidden />
                              <span>{item?.messageCount ?? 0}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400 shrink-0" aria-hidden />
                              <span>{formatToIST(item?.updatedAt)}</span>
                            </span>
                          </div>
                        </div>
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
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#7981C2] text-white font-medium hover:bg-purple-700 transition-colors"
                  onClick={() => showLogs(selectedChatSession?._id)}
                >
                  View chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout: 40% left (user + chats), 60% right (session summary); reduced height; gaps between sections */}
        <div className="h-[180px] hidden md:flex md:flex-col p-3 rounded-lg shadow-lg bg-white overflow-hidden border border-[#BFC4E5]/50">
          <div className="flex flex-1 min-h-0 gap-4">
            {/* Left 40%: user info + chat tile strip with gap between */}
            <div className="w-[40%] min-w-0 flex-shrink-0 flex gap-4 overflow-hidden">
              <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                <p className="font-baloo text-[#42476D] mb-0.5 text-lg">
                  {user.name}
                </p>
                <p className="text-xs text-[#898989] mb-1.5 break-words">
                  {user?.email}
                </p>
                <button
                  onClick={() => openChatSession(adminUser?.id, user?.userId)}
                  className="w-full px-2.5 py-1 rounded-lg bg-[#004A4E] text-white text-xs font-medium hover:bg-purple-700 transition-colors mb-1.5"
                >
                  Contact
                </button>
                <div className="space-y-0.5 font-medium text-xs">
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
              {user.sessions?.length > 0 && (
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative" ref={sortDropdownRef}>
                  <div className="flex-shrink-0 flex items-center justify-between gap-1 mb-1 relative">
                    <span className="text-xs font-semibold text-[#42476D] uppercase tracking-wide">Chats</span>
                    <button
                      type="button"
                      onClick={() => setShowSortDropdown((prev) => !prev)}
                      className="p-1 rounded-md text-[#7981C2] hover:bg-[#EEF0FE] border border-transparent hover:border-[#BFC4E5] transition-colors"
                      aria-label="Sort chats"
                      title="Sort"
                    >
                      <ArrowUpDown className="w-4 h-4" aria-hidden />
                    </button>
                    {showSortDropdown && (
                      <div className="absolute right-0 top-full mt-0.5 py-1 bg-white border border-[#BFC4E5] rounded-lg shadow-lg z-50 min-w-[160px] flex flex-col gap-0.5">
                        <button type="button" onClick={() => { setSortingType("messages"); setSortingOrder("desc"); setShowSortDropdown(false); }} className="text-left px-3 py-1.5 text-xs hover:bg-[#EEF0FE] rounded-md">Most messages first</button>
                        <button type="button" onClick={() => { setSortingType("messages"); setSortingOrder("asc"); setShowSortDropdown(false); }} className="text-left px-3 py-1.5 text-xs hover:bg-[#EEF0FE] rounded-md">Fewest messages first</button>
                        <button type="button" onClick={() => { setSortingType("lastUpdated"); setSortingOrder("desc"); setShowSortDropdown(false); }} className="text-left px-3 py-1.5 text-xs hover:bg-[#EEF0FE] rounded-md">Newest first</button>
                        <button type="button" onClick={() => { setSortingType("lastUpdated"); setSortingOrder("asc"); setShowSortDropdown(false); }} className="text-left px-3 py-1.5 text-xs hover:bg-[#EEF0FE] rounded-md">Oldest first</button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-none">
                    <div className="flex flex-col gap-1.5">
                      {sortedSessions.map((item, index) => {
                        const isSelected = selectedChatSession?._id === item._id;
                        return (
                          <button
                            key={item._id || index}
                            type="button"
                            className={`flex-shrink-0 text-left px-2 py-1.5 rounded-md border transition cursor-pointer flex flex-col gap-0.5 w-full ${isSelected
                              ? "bg-gray-200 font-semibold shadow-sm"
                              : "bg-white text-gray-200"
                              }`}
                            onClick={() => {
                              setSelectedChatSession(item);
                            }}
                          >
                            <span className="font-medium text-gray-900 text-xs truncate">{item?.title || `Chat ${index + 1}`}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-2.5 h-2.5 text-gray-400 shrink-0" aria-hidden />
                                <span>{item?.messageCount ?? 0}</span>
                              </span>
                              <span className="flex items-center gap-0.5 min-w-0 truncate">
                                <Clock className="w-2.5 h-2.5 text-gray-400 shrink-0" aria-hidden />
                                {formatToIST(item?.updatedAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Right 60%: session summary; icon row sticks to bottom */}
            <div className="w-[60%] min-w-0 flex-shrink-0 flex flex-col overflow-hidden pl-1">
              <div className="flex flex-1 min-h-0 gap-2">
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-2">
                  <h3 className="text-xs font-semibold text-[#42476D] uppercase tracking-wide mb-1.5 flex-shrink-0">
                    Session summary
                  </h3>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
                    {selectedChatSession ? (
                      <>
                        <p className="text-xs font-medium text-[#1D008F] mb-1 line-clamp-1">
                          {selectedChatSession?.title || "Untitled chat"}
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedChatSession?.chatSummary || "No summary available for this session."}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        Select a chat from the list to view its summary.
                      </p>
                    )}
                  </div>
                  {/* Icon row — sticks to bottom of section */}
                  {selectedChatSession && (
                    <div className="flex-shrink-0 flex flex-wrap items-center gap-3 mt-2 pt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                        <span>{selectedChatSession?.messageCount ?? 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                        <span>{formatToIST(selectedChatSession?.updatedAt)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircleMore className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                        <span>{selectedChatSession?.comment ? "1 Comment" : "0 Comments"}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                        <span>Assigned to: {Array.isArray(selectedChatSession?.assignedTo) ? selectedChatSession.assignedTo.join(", ") || "—" : (selectedChatSession?.assignedTo || "—")}</span>
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-1.5 px-2 py-2 flex-shrink-0">
                  <button type="button" onClick={() => showLogs(selectedChatSession?._id)} className="py-1.5 px-3 rounded-full bg-[#004A4E] text-xs text-white hover:opacity-90">
                    View chat
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedChatSession?._id && onOpenComments?.(selectedChatSession._id)}
                    className="py-1.5 px-3 rounded-full bg-[#004A4E] text-xs text-white hover:opacity-90"
                  >
                    Comments
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectedChatSession?._id &&
                      onOpenAssign?.({
                        sessionId: selectedChatSession._id,
                        assignedTo: selectedChatSession.assignedTo,
                      })
                    }
                    className="py-1.5 px-3 rounded-full bg-[#004A4E] text-xs text-white hover:opacity-90"
                  >
                    Assign to
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div >
    </>
  );
}
