"use client";
import { useEffect, useState } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import Loader from "./Loader";
import { User, X } from "lucide-react";

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
      <div className="flex items-center justify-center h-[50vh] bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="text-sm text-slate-600 mb-4">
            Hang on, all your messages are loading, please wait...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4 relative bg-white rounded-xl overflow-hidden flex flex-col h-[400px] border border-slate-200 shadow-sm">
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
      <div className="flex-1 overflow-y-auto scrollbar-none px-2 py-2">
        {Array.isArray(activeChats) && activeChats.length === 0 && (
          <div className="text-slate-400 text-sm px-2 py-4 text-center">
            No active chats yet.
          </div>
        )}
        {Array.isArray(activeChats) && activeChats.length > 0 && (
          <div className="flex flex-col gap-2">
            {Array.isArray(activeChats) &&
              activeChats.map((chat) => (
                <button
                  key={chat._id}
                  className="w-full text-left rounded-lg px-3 py-2 flex items-center gap-3  border border-transparent transition-all duration-200"
                  onClick={() => onOpenChat(chat.userA, chat.userB)}
                >
                  <div className="flex gap-4">
                    <div className="flex justify-between items-center">
                      <img
                        src="/avatar.png"
                        alt="Avatar"
                        className="w-6 h-6 rounded-full"
                      />
                    </div>
                    <div>
                      <div className="text-lg text-slate-800 truncate">
                        {chat.otherUser}
                      </div>
                      {/* <div className="text-xs text-slate-500 truncate">
                        {chat.otherUserEmail}
                      </div> */}
                      {chat.lastMessage && (
                        <div className="text-xs font-extralight text-gray-400 truncate mt-1">
                          {chat.lastMessage || ""}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
