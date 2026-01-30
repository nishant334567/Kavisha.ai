"use client";
import { useState, useEffect } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { MessageCircleMore } from "lucide-react";
import Inbox from "./Inbox";
import LiveChat from "./LiveChat";

export default function GlobalMessages() {
  const { user } = useFirebaseSession();
  const [showInbox, setShowInbox] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);

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
      {/* Messages Button - Mobile: below left sidebar icon; Desktop: bottom-right */}
      <button
        className="fixed left-0 top-28 z-40 md:left-auto md:right-4 md:top-auto md:bottom-4 w-10 h-10 md:w-14 md:h-14 md:p-4 flex items-center justify-center rounded-r md:rounded-full bg-[#264653] text-white shadow-lg hover:bg-[#1e383e] transition-colors border border-l-0 border-gray-300 md:border-0"
        onClick={() => setShowInbox(true)}
        title="Open Messages"
        aria-label="Open Messages"
      >
        <MessageCircleMore className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:items-end md:justify-end bg-black bg-opacity-30 md:bg-transparent">
          {/* Desktop: Show chat to the left of inbox if open */}
          {openChat && userA && userB && (
            <div className="hidden md:flex md:mr-4 md:mb-6">
              <div className="bg-white w-[500px] h-[80vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden rounded-xl">
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
          <div className="w-full h-full md:w-80 md:h-auto md:max-h-[60vh] md:mx-0 md:mr-6 md:mb-6 overflow-hidden shadow-2xl bg-white border border-slate-200 flex flex-col rounded-xl">
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
