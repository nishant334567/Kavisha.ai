"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../context/brand/BrandContextProvider";

export default function ChatSidebar({
  allChats,
  updateChatId,
  currentChatId,
  currentChatType,
  setCurrentChatType,
  onOpenInbox,
  onSidebarWidthChange,
}) {
  const { data: session } = useSession();
  const [isCollapsed, setIscollapsed] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const brandContext = useBrandContext();
  const [inboxChats, setInboxChats] = useState([]);
  const router = useRouter();
  if (session?.user) {
  }

  const getRoleMeta = (role) => {
    if (role === "recruiter") {
      return {
        label: "Recruiter",
        cls: "bg-blue-100 text-blue-700 border-blue-200",
      };
    }
    if (role === "dating") {
      return {
        label: "Dating",
        cls: "bg-pink-100 text-pink-700 border-pink-200",
      };
    }
    return {
      label: "Job Seeker",
      cls: "bg-orange-100 text-orange-700 border-orange-200",
    };
  };

  const formatIST = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const fetchAllInbox = async (chatId) => {
    updateChatId(chatId);
    setInboxLoading(true);
    try {
      const response = await fetch(`/api/inbox/${chatId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setInboxChats(data.chats || []);
    } catch (error) {
      console.error("Error fetching inbox:", error);
      setInboxChats([]);
    } finally {
      setInboxLoading(false);
    }
  };

  // const deleteSession = async (id) => {
  //   setIsdeleting(true);
  //   const response = await fetch("/api/allchats/", {
  //     method: "DELETE",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ chatId: id }),
  //   });
  //   setIsdeleting(false);
  // };
  const toggleLeftSideBar = () => {
    setIscollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (typeof onSidebarWidthChange === "function") {
      onSidebarWidthChange(isCollapsed ? 64 : 256);
    }
  }, [isCollapsed, onSidebarWidthChange]);

  const newChat = () => {
    updateChatId(null);
    setCurrentChatType(null);
    return;
  };

  return (
    <div>
      <div className="relative">
        {!isCollapsed && (
          <div className="mt-12 fixed top-0 left-0 z-40 flex flex-col w-64 h-[calc(100vh-56px)] p-4 border-r border-slate-200 bg-white shadow-sm">
            {/* User Info Section */}
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-sky-700 ">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold">
                {(brandContext?.brandName || "K").charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold text-white truncate text-base">
                  {session?.user?.name || "User"}
                </span>
                <span className="text-xs text-white truncate">
                  {session?.user?.email}
                </span>
              </div>
            </div>
            <div className="flex justify-between mb-2">
              <p className="font-semibold">Your Chats</p>
              <button className="p-1" onClick={() => toggleLeftSideBar()}>
                <img src="close-sidebar.png" width={20} />
              </button>
            </div>
            {/* End User Info Section */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="overflow-y-auto space-y-4 scrollbar-none">
                {allChats?.sessionIds?.length > 0 &&
                  allChats.sessionIds.map((id, idx) => (
                    <div className="flex w-full min-h-8 gap-2" key={id}>
                      <button
                        className={`text-slate-700 text-xs rounded-md px-2 py-2 border w-full
                    ${currentChatId === id && "bg-gray-100"}
                  `}
                        type="button"
                        onClick={() => {
                          updateChatId(id);
                          setCurrentChatType(allChats?.sessions[id]?.role);
                        }}
                      >
                        <div className="flex flex-col items-start text-left w-full">
                          <div className="flex items-center gap-2 w-full">
                            <span className="truncate">
                              {allChats?.sessions[id]?.title ||
                                `Chat ${idx + 1} `}
                            </span>
                          </div>
                          {allChats?.sessions[id]?.updatedAt && (
                            <span className="text-[10px] text-slate-500 mt-1">
                              {formatIST(allChats?.sessions[id]?.updatedAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="flex items-center gap-2 justify-center text-xs bg-slate-50 w-full p-2 rounded-md hover:bg-sky-50 hover:border-sky-200 transition-all duration-200 text-slate-700 border border-slate-200"
                onClick={() => onOpenInbox && onOpenInbox()}
              >
                All Messages
              </button>

              <button
                className="flex gap-2 justify-center text-xs bg-sky-700 hover:bg-sky-600 text-white w-full p-2 mt-2 rounded-md font-medium transition-colors"
                onClick={() => newChat()}
              >
                {!newChatLoading ? "New Chat" : "Creating New Chat..."}
              </button>

              <button
                className="flex items-center gap-2 justify-center text-xs bg-slate-50 w-full p-2 rounded-md hover:bg-red-50 hover:border-red-200 transition-all duration-200 text-red-600 border border-slate-200"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </button>
              {brandContext?.isBrandAdmin && (
                <button
                  className="flex items-center gap-2 justify-center text-xs bg-slate-50 w-full p-2 rounded-md hover:bg-sky-50 hover:border-sky-200 transition-all duration-200 text-slate-700 border border-slate-200"
                  onClick={() => {
                    const isKavisha =
                      (brandContext?.subdomain || "").toLowerCase() ===
                      "kavisha";
                    const target = isKavisha
                      ? "/admin"
                      : `/admin/${(brandContext?.subdomain || "").toLowerCase()}`;
                    router.push(target);
                  }}
                >
                  🛡️ Admin Dashboard
                </button>
              )}
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="fixed top-0 left-0 z-40 w-16 h-full py-4 flex flex-col items-center gap-4 border-r border-slate-200 bg-white/90 backdrop-blur">
            <div className="w-8 h-8 rounded-full bg-sky-700 text-white flex items-center justify-center text-sm font-semibold">
              {(brandContext?.brandName || "K").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => toggleLeftSideBar()}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-slate-100"
              title="Open sidebar"
            >
              <img src="close-sidebar.png" width={20} height={20} />
            </button>
            <button
              onClick={() => {
                (newChat(), setIscollapsed((prev) => !prev));
              }}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-slate-100"
              title="New chat"
            >
              <img src="add.png" width={20} height={20} />
            </button>
            <button
              onClick={() => onOpenInbox && onOpenInbox()}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-slate-100"
              title="All messages"
            >
              <img src="chat.png" width={20} height={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
