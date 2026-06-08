"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { normalizeBrandHex } from "../lib/brandTheme";
import { Info, MessageCircleMore } from "lucide-react";
import Inbox from "./Inbox";
import LiveChat from "./LiveChat";

const MESSAGES_INFO_COPY =
  "This is where all your chats with people will be. :)";

const noop = () => {};

const GlobalMessagesContext = createContext({
  available: false,
  openInbox: noop,
  isActive: false,
});

export function useGlobalMessages() {
  return useContext(GlobalMessagesContext);
}

export default function GlobalMessages({ children, enabled = true }) {
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

  useEffect(() => () => clearHoverLeaveTimer(), []);

  const openInbox = useCallback(() => setShowInbox(true), []);
  const closeInbox = useCallback(() => setShowInbox(false), []);

  const openChatSession = useCallback((chatUserA, chatUserB) => {
    setUserA(chatUserA);
    setUserB(chatUserB);
    setConnectionId([chatUserA, chatUserB].sort().join("_"));
    setOpenChat(true);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowInbox(false);
    }
  }, []);

  const closeChat = useCallback(() => setOpenChat(false), []);

  const isKavishaMainBrand =
    String(brand?.subdomain || "").toLowerCase() === "kavisha";
  const available =
    enabled && Boolean(user?.id) && !isKavishaMainBrand;
  const isActive = showInbox || openChat;

  return (
    <GlobalMessagesContext.Provider
      value={{ available, openInbox, isActive }}
    >
      {children}

      {available && (
        <>
          <div
            className="fixed bottom-4 right-4 z-40 hidden md:block"
            onMouseEnter={() => {
              clearHoverLeaveTimer();
              setHoverTip(true);
            }}
            onMouseLeave={() => {
              clearHoverLeaveTimer();
              hoverLeaveTimerRef.current = setTimeout(
                () => setHoverTip(false),
                180,
              );
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
              className={`relative flex h-14 w-14 items-center justify-center rounded-full border-0 p-4 text-white shadow-lg ${!primaryHex ? "bg-[#00888E]" : ""}`}
              style={primaryHex ? { backgroundColor: primaryHex } : undefined}
              onClick={openInbox}
              aria-label="Open Messages"
            >
              <MessageCircleMore className="h-6 w-6" />
              <span
                className={`pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-white shadow-md ${!primaryHex ? "border-[#00888E] text-[#00888E]" : ""}`}
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
                <Info className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </button>
          </div>

          {showInbox && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 md:items-end md:justify-end md:bg-transparent">
              {openChat && userA && userB && (
                <div className="hidden md:flex md:mr-4 md:mb-6">
                  <div className="flex h-[80vh] w-[500px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                    <LiveChat
                      userA={userA}
                      userB={userB}
                      currentUserId={user?.id}
                      onClose={closeChat}
                      connectionId={connectionId}
                      isEmbedded={true}
                    />
                  </div>
                </div>
              )}
              <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl md:mx-0 md:mb-6 md:mr-6 md:h-auto md:max-h-[60vh] md:w-80">
                <Inbox onOpenChat={openChatSession} onClose={closeInbox} />
              </div>
            </div>
          )}

          {openChat && userA && userB && !showInbox && (
            <LiveChat
              userA={userA}
              userB={userB}
              currentUserId={user?.id}
              onClose={closeChat}
              connectionId={connectionId}
            />
          )}
        </>
      )}
    </GlobalMessagesContext.Provider>
  );
}
