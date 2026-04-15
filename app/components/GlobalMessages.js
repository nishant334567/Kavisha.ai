"use client";
import { useState, useEffect, useRef } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { normalizeBrandHex } from "../lib/brandTheme";
import { Info, MessageCircleMore } from "lucide-react";
import Inbox from "./Inbox";
import LiveChat from "./LiveChat";

const MESSAGES_INFO_COPY =
  "This is where all your chats with people will be. :)";

export default function GlobalMessages() {
  const { user } = useFirebaseSession();
  const brand = useBrandContext();
  const primaryHex = normalizeBrandHex(brand?.primaryBrandColor);
  const secondaryHex = normalizeBrandHex(brand?.secondaryBrandColor);
  const [showInbox, setShowInbox] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [hoverTip, setHoverTip] = useState(false);
  const hoverLeaveTimerRef = useRef(null);

  const clearHoverLeaveTimer = () => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearHoverLeaveTimer();
  }, []);

  // Don't show if user is not logged in
  if (!user?.id) {
    return null;
  }

  const openChatSession = (chatUserA, chatUserB) => {
    setUserA(chatUserA);
    setUserB(chatUserB);
    setConnectionId([chatUserA, chatUserB].sort().join("_"));
    setOpenChat(true);
    // On mobile, close inbox when opening chat. On desktop, keep both open.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowInbox(false);
    }
  };

  return (
    <>
      {/* Messages FAB — hover shows hint only; no hover background change */}
      <div
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 md:bottom-4"
        onMouseEnter={() => {
          clearHoverLeaveTimer();
          setHoverTip(true);
        }}
        onMouseLeave={() => {
          clearHoverLeaveTimer();
          hoverLeaveTimerRef.current = setTimeout(() => setHoverTip(false), 180);
        }}
      >
        {hoverTip ? (
          <div
            className="pointer-events-auto absolute bottom-[calc(100%-6px)] right-0 z-20 w-[min(calc(100vw-2rem),16rem)] rounded-lg border border-border bg-card px-3 py-2 text-left text-xs leading-snug text-foreground shadow-xl ring-1 ring-black/5"
            role="tooltip"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: primaryHex || "#00888E",
            }}
          >
            {MESSAGES_INFO_COPY}
          </div>
        ) : null}
        <button
          type="button"
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border-0 text-white shadow-lg md:h-14 md:w-14 md:p-4 ${!primaryHex ? "bg-[#00888E]" : ""}`}
          style={primaryHex ? { backgroundColor: primaryHex } : undefined}
          onClick={() => setShowInbox(true)}
          aria-label="Open Messages"
        >
          <MessageCircleMore className="h-5 w-5 md:h-6 md:w-6" />
          <span
            className={`pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white shadow-md md:h-7 md:w-7 ${!primaryHex ? "border-[#00888E] text-[#00888E]" : ""}`}
            aria-hidden
            style={
              primaryHex || secondaryHex
                ? {
                    borderColor: primaryHex || "#00888E",
                    color: secondaryHex || primaryHex || "#00888E",
                  }
                : undefined
            }
          >
            <Info className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2.5} />
          </span>
        </button>
      </div>

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:items-end md:justify-end bg-black bg-opacity-30 md:bg-transparent">
          {/* Desktop: Show chat to the left of inbox if open */}
          {openChat && userA && userB && (
            <div className="hidden md:flex md:mr-4 md:mb-6">
              <div className="bg-background w-[500px] h-[80vh] border border-border shadow-2xl flex flex-col overflow-hidden rounded-xl">
                <LiveChat
                  userA={userA}
                  userB={userB}
                  currentUserId={user?.id}
                  onClose={() => setOpenChat(false)}
                  connectionId={connectionId}
                  isEmbedded={true}
                />
              </div>
            </div>
          )}
          {/* Inbox - always at bottom right on desktop */}
          <div className="w-full h-full md:w-80 md:h-auto md:max-h-[60vh] md:mx-0 md:mr-6 md:mb-6 overflow-hidden shadow-2xl bg-background border border-border flex flex-col rounded-xl">
            <Inbox
              onOpenChat={openChatSession}
              onClose={() => setShowInbox(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile: Show chat full screen when open and inbox is closed */}
      {openChat && userA && userB && !showInbox && (
        <LiveChat
          userA={userA}
          userB={userB}
          currentUserId={user?.id}
          onClose={() => setOpenChat(false)}
          connectionId={connectionId}
        />
      )}
    </>
  );
}
