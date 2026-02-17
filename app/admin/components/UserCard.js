"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { formatToIST } from "@/app/utils/formatToIST";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { ChevronDown, ChevronRight, MessageCircle, Clock, IndianRupee, MessagesSquare, ArrowUpDown } from "lucide-react";

export default function UserCard({
  user,
  setShowLogsModal,
  setSelectedSessionLogs,
  openChatSession,
  onOpenSessionView,
}) {
  const brandContext = useBrandContext();
  const { user: adminUser } = useFirebaseSession();
  const [selectedChatSession, setSelectedChatSession] = useState("");
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [sortingType, setSortingType] = useState("messages");
  const [sortingOrder, setSortingOrder] = useState("desc");
  const sessionDropdownRef = useRef(null);
  const chatTitlesScrollRef = useRef(null);

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
    };

    if (showSessionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSessionDropdown]);

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
              className="px-3 py-1.5 rounded-lg bg-[#7981C2] text-white text-xs font-medium hover:bg-purple-700 transition-colors"
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
                        key={index}
                        className={`w-full text-left px-3 py-1.5 rounded-md border text-sm transition cursor-pointer ${isSelected
                          ? "bg-[#EEF0FE] border-[#BFC4E5] text-gray-900 font-semibold shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                          }`}
                        onClick={() => {
                          setSelectedChatSession(item);
                          setShowSessionDropdown(false);
                          onOpenSessionView?.(item?._id);
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

        {/* Desktop Layout: top = user info, bottom = horizontal scrollable chat titles */}
        <div className="hidden md:flex md:flex-col md:gap-3 p-4 rounded-sm shadow-lg">
          {/* Top: name, email, contact, stats */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="font-baloo text-[#42476D] mb-1 text-xl font-semibold">{user.name}</p>
              <p className="text-xs text-[#898989] break-words">{user?.email}</p>
              <button
                onClick={() => openChatSession(adminUser?.id, user?.userId)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#7981C2] text-white text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                Contact
              </button>
              <div className="flex items-center gap-3 text-xs text-[#42476D] font-medium mt-2">
                <span className="flex items-center gap-1">
                  <MessagesSquare className="w-4 h-4 text-[#7981C2] shrink-0" aria-hidden />
                  <span>{user.sessions?.reduce((sum, s) => sum + (s.messageCount || 0), 0) || 0}</span>
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="w-4 h-4 text-[#7981C2] shrink-0" aria-hidden />
                  <span>{((user.sessions?.reduce((sum, s) => sum + (s.totalCost || 0), 0) || 0)).toFixed(2)}</span>
                </span>
              </div>
              {/* Sort option below total message and rupee count */}
              {user.sessions?.length > 0 && (
                <div className="flex gap-1 items-center mt-2">
                  <ArrowUpDown className="w-4 h-4 text-[#7981C2] shrink-0" aria-label="Sort" />
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
              )}
            </div>
          </div>

          {/* Bottom: horizontally scrollable chat titles + chevron right to scroll */}
          {user.sessions?.length > 0 && (
            <div className="flex items-center gap-2 min-w-0 border-t border-[#BFC4E5] pt-2">
              <div
                ref={chatTitlesScrollRef}
                className="flex-1 flex gap-2 overflow-x-auto overflow-y-hidden py-1 scroll-smooth scrollbar-none min-h-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {sortedSessions.map((item, index) => {
                  const isSelected = selectedChatSession?._id === item._id;
                  return (
                    <button
                      key={item._id || index}
                      type="button"
                      className={`flex-shrink-0 text-left px-3 py-2 rounded-lg border transition cursor-pointer flex flex-col gap-0.5 min-w-[120px] max-w-[160px] ${isSelected
                        ? "bg-[#EEF0FE] border-[#BFC4E5] font-semibold shadow-sm"
                        : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                        }`}
                      onClick={() => {
                        setSelectedChatSession(item);
                        onOpenSessionView?.(item?._id);
                      }}
                    >
                      <span className="font-medium text-gray-900 text-xs truncate">{item?.title || `Chat ${index + 1}`}</span>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-gray-400 shrink-0" aria-hidden />
                          <span>{item?.messageCount ?? 0}</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" aria-hidden />
                          {formatToIST(item?.updatedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  const el = chatTitlesScrollRef.current;
                  if (el) el.scrollBy({ left: 200, behavior: "smooth" });
                }}
                className="flex-shrink-0 p-2 rounded-lg bg-[#EEF0FE] border border-[#BFC4E5] text-[#42476D] hover:bg-[#BFC4E5] transition-colors"
                aria-label="Scroll chat list right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
