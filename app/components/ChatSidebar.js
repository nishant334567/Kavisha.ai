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
  isCommunity = false,
  onNewCommunityChat,
  chatBasePath = "/chats",
  homePath = "/",
  servicesProvided = [],
  onSelectService,
  isCreatingSession = false,
}) {
  const { user } = useFirebaseSession();
  const [isCollapsed, setIscollapsed] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);
  const [showCommunityNewDropdown, setShowCommunityNewDropdown] = useState(false);
  const brandContext = useBrandContext();

  const [deletingChatId, setDeletingChatId] = useState(null);
  const router = useRouter();

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

            <div className="h-full md:mt-12 fixed top-0 left-0 z-40 flex flex-col  p-4 border-r border-border bg-muted-bg shadow-sm sm:translate-x-0 transition-transform duration-300 ease-in-out">
              <div className="font-akshar flex items-center gap-3 mb-6 p-3 rounded-xl bg-[#3D5E6B] text-[#FFEED8] ">
                <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user?.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(user?.name || "K").charAt(0).toUpperCase()}</span>
                  )}
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
                                className="w-full px-3 py-2 text-left text-xs font-akshar uppercase text-foreground hover:bg-muted-bg transition-colors"
                                onClick={() => {
                                  onNewCommunityChat("job_seeker", "Looking for work", "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)");
                                  setShowCommunityNewDropdown(false);
                                }}
                              >
                                Find Jobs
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs font-akshar uppercase text-foreground hover:bg-muted-bg transition-colors"
                                onClick={() => {
                                  onNewCommunityChat("recruiter", "Looking at hiring", "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)");
                                  setShowCommunityNewDropdown(false);
                                }}
                              >
                                Hire People
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs font-akshar uppercase text-foreground hover:bg-muted-bg transition-colors"
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
                        onClick={() => router.push("/community")}
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
                                    className="w-full px-3 py-2 text-left text-xs font-akshar uppercase text-foreground hover:bg-muted-bg transition-colors"
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
                      <button
                        type="button"
                        className="flex gap-2 justify-center text-xs bg-muted-bg text-foreground w-full p-2 rounded-md font-medium hover:bg-muted-bg/80 transition-colors mt-2"
                        onClick={() => router.push("/community")}
                      >
                        Community
                      </button>
                    </>
                  )}


                  {brandContext?.isBrandAdmin && (
                    <button
                      className="flex items-center gap-2 justify-center text-xs bg-muted-bg w-full p-2 rounded-md hover:bg-sky-50 hover:border-sky-200 transition-all duration-200 text-foreground border border-border"
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
                          <div className="w-6 h-6 border-2 border-border rounded-full"></div>
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
                        className="flex justify-center items-center w-full gap-2 border-b-2 border-border"
                        key={id}
                      >
                        <button
                          className={`text-muted px-2 py-4 flex-1 text-left
                    ${currentChatId === id && "font-semibold"}
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
                              const url =
                                hostname === "localhost" || hostname === "127.0.0.1"
                                  ? `${path}?subdomain=${sessionBrand}`
                                  : `https://${sessionBrand}.kavisha.ai${path}`;
                              window.open(url, "_blank");
                              return;
                            }
                            router.push(`${chatBasePath}/${id}`);
                          }}
                        >
                          <div className="font-akshar flex flex-col items-start w-full justify-center">
                            {/* Show brand name above title when brand is kavisha */}
                            {brandContext?.subdomain === "kavisha" &&
                              allChats?.sessions[id]?.brand &&
                              allChats.sessions[id].brand !== "kavisha" && (
                                <span className="text-[10px] text-muted bg-muted-bg px-1.5 py-0.5 rounded mb-0.5 whitespace-nowrap">
                                  {allChats.sessions[id].brand
                                    .charAt(0)
                                    .toUpperCase() +
                                    allChats.sessions[id].brand.slice(1)}
                                </span>
                              )}
                            {isCommunity && (
                              <span
                                className={`inline-block text-[10px] px-1.5 py-0.5 rounded mb-0.5 ${allChats?.sessions[id]?.allDataCollected
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                                  }`}
                              >
                                {allChats?.sessions[id]?.allDataCollected
                                  ? "Completed"
                                  : "In progress"}
                              </span>
                            )}
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <span className="truncate">
                                {allChats?.sessions[id]?.title ||
                                  `Chat ${idx + 1} `}
                              </span>
                            </div>
                            {allChats?.sessions[id]?.updatedAt && (
                              <span className="text-[10px] text-muted mt-1">
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
            </div>
          </>
        )}
        {isCollapsed && (
          <>
            {/* Mobile: Small toggle button */}
            <div className=" fixed top-16 z-40">
              <button
                onClick={() => toggleLeftSideBar()}
                className="w-10 h-10 flex items-center justify-center rounded-r text-foreground shadow-xl border border-border hover:bg-[#59646F] hover:text-[#FFEED8] transition-colors"
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
