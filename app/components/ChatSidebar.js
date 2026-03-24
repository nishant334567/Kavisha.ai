"use client";

import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signOut } from "../lib/firebase/logout";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { X, PanelLeftClose, GripVertical, Trash2 } from "lucide-react";

export default function ChatSidebar({
  allChats,
  updateChatId,
  currentChatId,
  setCurrentChatType,
  onCollapsedChange,
  isCommunity = false,
  onNewCommunityChat,
  chatBasePath = "/chats",
  homePath = "/",
  servicesProvided = [],
  onSelectService,
  isCreatingSession = false,
  defaultCollapsed = true,
  openRequest, // when passed (e.g. from /chats), parent controls open/close; when undefined, sidebar manages itself
}) {
  const { user } = useFirebaseSession();
  const [isCollapsed, setIscollapsed] = useState(defaultCollapsed);

  // When parent passes openRequest, sync sidebar to it (open when true, close when false)
  useEffect(() => {
    if (openRequest === undefined) return;
    setIscollapsed(!openRequest);
  }, [openRequest]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);
  const [showCommunityNewDropdown, setShowCommunityNewDropdown] = useState(false);
  const brandContext = useBrandContext();

  const [deletingChatId, setDeletingChatId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Services for dropdown: exclude quiz and community
  const servicesList = Array.isArray(servicesProvided) ? servicesProvided : [];
  const chatServices = servicesList.filter(
    (s) =>
      s?.name &&
      s.name.toLowerCase() !== "quiz" &&
      s.name.toLowerCase() !== "community"
  );

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
    router.push(homePath);
    updateChatId(null);
    setCurrentChatType(null);
    setIscollapsed(true);
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
        router.push(homePath);
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

            <div className="font-baloo h-full max-h-[100vh] md:mt-12 md:h-[calc(100vh-3rem)] fixed top-0 left-0 z-40 flex flex-col w-[280px] border-r border-border bg-background shadow-sm sm:translate-x-0 transition-transform duration-300 ease-in-out">
              <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="flex justify-between">
                <p className="font-semibold text-muted">Your Chats</p>
                <button className="p-1" onClick={() => toggleLeftSideBar()} title="Close sidebar" aria-label="Close sidebar">
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="py-4 gap-2">
                  {isCommunity ? (
                    <>
                      <div className="relative">
                        <button
                        className="flex gap-2 justify-center text-xs bg-[#3D5E6B] text-[#FFEED8] w-full p-2 rounded-md font-medium transition-colors"
                          onClick={() => setShowCommunityNewDropdown((v) => !v)}
                        >
                          New
                        </button>
                        {showCommunityNewDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-[45]"
                              aria-hidden="true"
                              onClick={() => setShowCommunityNewDropdown(false)}
                            />
                            <div
                              className="absolute left-0 top-full mt-1 w-full min-w-[160px] rounded-md border border-border bg-card py-1 shadow-lg z-[50]"
                              role="listbox"
                            >
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs uppercase text-foreground hover:bg-muted-bg transition-colors"
                                onClick={() => {
                                  onNewCommunityChat("job_seeker", "Looking for work", "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)");
                                  setShowCommunityNewDropdown(false);
                                }}
                              >
                                Find Jobs
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs uppercase text-foreground hover:bg-muted-bg transition-colors"
                                onClick={() => {
                                  onNewCommunityChat("recruiter", "Looking at hiring", "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)");
                                  setShowCommunityNewDropdown(false);
                                }}
                              >
                                Hire People
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs uppercase text-foreground hover:bg-muted-bg transition-colors"
                                onClick={() => {
                                  onNewCommunityChat("friends", "Looking for a friend", "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)");
                                  setShowCommunityNewDropdown(false);
                                }}
                              >
                                Find Friends
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="flex gap-2 justify-center text-xs bg-muted-bg text-foreground w-full p-2 rounded-md font-medium hover:bg-muted-bg/80 transition-colors mt-2"
                        onClick={() => {
                          if (pathname === "/community") {
                            setIscollapsed(true);
                            onCollapsedChange?.(true);
                          } else {
                            router.push("/community");
                          }
                        }}
                      >
                        Community
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <button
                          className="flex gap-2 justify-center text-xs bg-[#3D5E6B] text-[#FFEED8] w-full p-2 rounded-md font-medium transition-colors"
                          onClick={() =>
                            chatServices.length > 0 && onSelectService
                              ? setShowNewChatDropdown((v) => !v)
                              : newChat()
                          }
                          disabled={isCreatingSession}
                        >
                          {!newChatLoading && !isCreatingSession
                            ? "New Chat"
                            : "Creating..."}
                        </button>
                        {showNewChatDropdown &&
                          chatServices.length > 0 &&
                          onSelectService && (
                            <>
                              <div
                                className="fixed inset-0 z-[45]"
                                aria-hidden="true"
                                onClick={() => setShowNewChatDropdown(false)}
                              />
                              <div
                                className="absolute left-0 top-full mt-1 w-full min-w-[180px] rounded-md border border-border bg-card py-1 shadow-lg z-[50] max-h-48 overflow-y-auto"
                                role="listbox"
                              >
                                {chatServices.map((item, idx) => (
                                  <button
                                    key={item._key || idx}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-xs uppercase text-foreground hover:bg-muted-bg transition-colors"
                                    onClick={() => {
                                      onSelectService(
                                        item.name,
                                        item.initialMessage,
                                        false,
                                        item.title || item.name,
                                        item._key
                                      );
                                      setShowNewChatDropdown(false);
                                    }}
                                  >
                                    {item.title || item.name}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                  {!allChats ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <div className="w-6 h-6 border-2 border-border rounded-full"></div>
                          <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-[#59646F] rounded-full animate-spin"></div>
                        </div>
                        <div className="text-muted text-xs font-medium">
                          Loading chats...
                        </div>
                      </div>
                    </div>
                  ) : allChats?.sessionIds?.length > 0 ? (
                    allChats.sessionIds.map((id, idx) => (
                      <div
                        className={`flex items-center w-full gap-2 rounded-md transition-colors ${currentChatId === id ? "bg-muted-bg" : ""} hover:bg-muted-bg`}
                        key={id}
                      >
                        <button
                          className={`text-muted px-2 py-3 flex-1 text-left min-w-0 truncate text-sm rounded-md
                    ${currentChatId === id ? "font-semibold text-foreground" : "text-foreground"}
                  `}
                          type="button"
                          onClick={() => {
                            const sessionBrand = allChats?.sessions[id]?.brand;
                            const isKavisha = brandContext?.subdomain === "kavisha";
                            const otherBrand =
                              isKavisha && sessionBrand && sessionBrand !== "kavisha";

                            if (otherBrand) {
                              const hostname =
                                typeof window !== "undefined"
                                  ? window.location.hostname
                                  : "";
                              const path = isCommunity
                                ? `/community/${id}`
                                : `/chats/${id}`;
                              const onStaging = hostname.includes(".staging.");
                              const baseUrl =
                                hostname === "localhost" || hostname === "127.0.0.1"
                                  ? null
                                  : onStaging
                                    ? `https://${sessionBrand}.staging.kavisha.ai`
                                    : `https://${sessionBrand}.kavisha.ai`;
                              const url = baseUrl ? `${baseUrl}${path}` : `${path}?subdomain=${sessionBrand}`;
                              window.open(url, "_blank");
                              setIscollapsed(true);
                              onCollapsedChange?.(true);
                              return;
                            }
                            router.push(`${chatBasePath}/${id}`);
                            setIscollapsed(true);
                            onCollapsedChange?.(true);
                          }}
                        >
                          <span className="truncate block">
                            {allChats?.sessions[id]?.title ||
                              `Chat ${idx + 1}`}
                          </span>
                        </button>
                        <button
                          className="flex-shrink-0 p-2 hover:bg-red-50 rounded transition-colors"
                          onClick={(e) => deleteSession(id, e)}
                          disabled={deletingChatId === id}
                          title="Delete chat"
                        >
                          {deletingChatId === id ? (
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4 text-muted hover:text-red-600" />
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs text-muted">
                        No chats yet
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile card - fixed at bottom */}
              <div className="font-baloo flex-shrink-0 border-t border-border pt-3 pb-2 mt-auto">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                    <span className="font-bold text-foreground text-sm uppercase tracking-[0.08em] truncate">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted truncate mt-0.5">
                      {user?.email}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted-bg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={user?.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted">
                        {(user?.name || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </>
        )}
        {isCollapsed && (
          <button
            onClick={() => toggleLeftSideBar()}
            className="fixed left-0 top-16 z-40 w-6 h-12 flex items-center justify-center rounded-r opacity-90 hover:opacity-100 bg-[#00888E] hover:bg-[#006d72] text-white transition-all border-0 shadow-sm hover:shadow-md focus:outline-none focus:ring-0"
            style={{ touchAction: "manipulation" }}
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <GripVertical className="w-4 h-4 shrink-0" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
