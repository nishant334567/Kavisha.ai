"use client";

import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signOut } from "../lib/firebase/logout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { X, ChevronsRight, ChevronLeft, Trash2 } from "lucide-react";

export default function ChatSidebar({
  allChats,
  updateChatId,
  currentChatId,
  setCurrentChatType,
  onCollapsedChange,
}) {
  const { user } = useFirebaseSession();
  const [isCollapsed, setIscollapsed] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const brandContext = useBrandContext();

  const [deletingChatId, setDeletingChatId] = useState(null);
  const router = useRouter();

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

  const toggleLeftSideBar = () => {
    setIscollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  const newChat = () => {
    router.push("/");
    updateChatId(null);
    setCurrentChatType(null);
    setIscollapsed(true);
    return;
  };

  const deleteSession = async (chatId, e) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    if (
      !confirm(
        "Are you sure you want to delete this chat? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeletingChatId(chatId);
    try {
      const endpoint =
        brandContext.subdomain === "kavisha"
          ? "/api/allchats"
          : `/api/allchats/${brandContext.subdomain}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      // If the deleted chat is the current chat, redirect to home
      if (currentChatId === chatId) {
        router.push("/");
        updateChatId(null);
        setCurrentChatType(null);
      }

      // Clear localStorage if the deleted chat matches stored values
      if (user && brandContext) {
        const lastChatKey = `lastChat:${user.id}:${brandContext.brandName}`;
        const lastChatTypeKey = `lastChatType:${user.id}`;
        const storedChatId = localStorage.getItem(lastChatKey);

        if (storedChatId === chatId) {
          localStorage.removeItem(lastChatKey);
          localStorage.removeItem(lastChatTypeKey);
        }
      }

      // Refresh the page to update the chat list
      router.refresh();
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat. Please try again.");
    } finally {
      setDeletingChatId(null);
    }
  };

  return (
    <div>
      <div className="relative">
        {!isCollapsed && (
          <>
            <div
              className="sm:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
              onClick={() => toggleLeftSideBar()}
            ></div>

            <div className="h-full md:mt-12 fixed top-0 left-0 z-40 flex flex-col  p-4 border-r border-slate-200 bg-[#F8F8F8] shadow-sm sm:translate-x-0 transition-transform duration-300 ease-in-out">
              <div className="font-akshar flex items-center gap-3 mb-6 p-3 rounded-xl bg-[#59646F] text-[#FFEED8] ">
                <div className="w-8 h-8 rounded-full bg-white/20  flex items-center justify-center text-sm font-semibold">
                  {(user?.name || "K").charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold truncate text-base">
                    {user?.name?.toUpperCase() || "User"}
                  </span>
                  <span className="text-xs  truncate">{user?.email}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold text-slate-600">Your Chats</p>
                <button className="p-1" onClick={() => toggleLeftSideBar()}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="py-4 gap-2">
                  <button
                    className="flex gap-2 justify-center text-xs bg-[#59646F] text-[#FFEED8]   w-full p-2 rounded-md font-medium transition-colors"
                    onClick={() => newChat()}
                  >
                    {!newChatLoading ? "New Chat" : "Creating New Chat..."}
                  </button>

                  {brandContext?.isBrandAdmin && (
                    <button
                      className="flex items-center gap-2 justify-center text-xs bg-slate-50 w-full p-2 rounded-md hover:bg-sky-50 hover:border-sky-200 transition-all duration-200 text-slate-700 border border-slate-200"
                      onClick={() => {
                        const target = `/admin/${(brandContext?.subdomain || "").toLowerCase()}`;
                        router.push(target);
                      }}
                    >
                      🛡️ Admin Dashboard
                    </button>
                  )}
                </div>
                <div className="h-[60vh] overflow-y-auto scrollbar-none">
                  {!allChats ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-6 h-6 border-2 border-gray-200 rounded-full"></div>
                          <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-[#59646F] rounded-full animate-spin"></div>
                        </div>
                        <div className="text-[#59646F] text-xs font-medium">
                          Loading chats...
                        </div>
                      </div>
                    </div>
                  ) : allChats?.sessionIds?.length > 0 ? (
                    allChats.sessionIds.map((id, idx) => (
                      <div
                        className="flex justify-center items-center w-full gap-2 border-b-2 border-slate-200"
                        key={id}
                      >
                        <button
                          className={`text-slate-600 px-2 py-4 flex-1 text-left
                    ${currentChatId === id && "font-semibold"}
                  `}
                          type="button"
                          onClick={() => {
                            // const chatType =
                            //   allChats?.sessions[id]?.role || "default";
                            router.push(`/chats/${id}`);
                            // updateChatId(id);
                            // setCurrentChatType(chatType);
                            // setIscollapsed(true);
                          }}
                        >
                          <div className="font-akshar flex flex-col items-start w-full justify-center">
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
                        <button
                          className="flex-shrink-0 py-4 px-2 hover:bg-red-50 rounded transition-colors"
                          onClick={(e) => deleteSession(id, e)}
                          disabled={deletingChatId === id}
                          title="Delete chat"
                        >
                          {deletingChatId === id ? (
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-600" />
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs text-slate-500">
                        No chats yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {isCollapsed && (
          <>
            {/* Mobile: Small toggle button */}
            <div className=" fixed top-16 z-40">
              <button
                onClick={() => toggleLeftSideBar()}
                className="w-10 h-10 flex items-center justify-center rounded-r text-[#59646F] shadow-xl border border-gray-300 hover:bg-[#59646F] hover:text-[#FFEED8] transition-colors"
                title="Open sidebar"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
