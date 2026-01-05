"use client";
import { useEffect, useState } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import Loader from "./Loader";
import { User, X } from "lucide-react";
import { formatTime } from "../utils/dateUtils";

export default function Inbox({ onOpenChat, onClose }) {
  const { user } = useFirebaseSession();
  const [activeChats, setActiveChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchActiveChats = async () => {
      setLoading(true);
      const response = await fetch(`/api/active-chats/${user.id}`);
      const data = await response.json();

      setActiveChats(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchActiveChats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full md:h-[400px] bg-white border border-slate-200 shadow-sm">
        <Loader message="Loading messages..." />
      </div>
    );
  }
  return (
    <div className="relative bg-white overflow-hidden flex flex-col h-full md:h-[400px]">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-800">Messaging</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Close Inbox"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        )}
      </div>
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {Array.isArray(activeChats) && activeChats.length === 0 && (
          <div className="text-slate-400 text-sm px-2 py-4 text-center">
            No active chats yet.
          </div>
        )}
        {Array.isArray(activeChats) && activeChats.length > 0 && (
          <div className="flex flex-col">
            {Array.isArray(activeChats) &&
              activeChats.map((chat, index) => (
                <div key={chat._id}>
                  <div
                    className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                    onClick={() => onOpenChat(chat.userA, chat.userB)}
                  >
                    <img
                      src="/avatar.png"
                      alt="Avatar"
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-baloo text-slate-800 truncate">
                        {chat.otherUser}
                      </div>
                      {chat.lastMessage && (
                        <div className="font-dosis text-sm text-gray-500 truncate mt-0.5">
                          {chat.lastMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center flex-shrink-0 ml-2">
                      {chat.lastMessageTime && (
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTime(chat.lastMessageTime)}
                        </div>
                      )}
                    </div>
                  </div>
                  {index !== activeChats.length - 1 && (
                    <div className="h-[0.5px] w-full bg-gray-200"></div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
