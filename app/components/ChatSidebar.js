"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Notification from "./Notification";
import { useRouter } from "next/navigation";

export default function ChatSidebar({
  allChats,
  updateChatId,
  currentChatId,
  notifications,
  onOpenInboxChat, // Add this prop for opening inbox chats
}) {
  const { data: session } = useSession();
  const [isDeleting, setIsdeleting] = useState(false);
  const [isCollapsed, setIscollapsed] = useState(true);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [activeChats, setActivechats] = useState([]);
  const [inboxChats, setInboxChats] = useState([]);
  const [openingChatId, setOpeningChatId] = useState(null);
  const router = useRouter();

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

  const handleInboxChatClick = async (receiverSession) => {
    if (onOpenInboxChat) {
      try {
        // Pass the chat data in the format expected by LiveChat component
        const chatData = {
          senderSession: currentChatId, // Current user's session
          receiverSession: receiverSession, // Other user's session
        };

        await onOpenInboxChat(chatData);
      } catch (error) {
        console.error("Error opening inbox chat:", error);
      } finally {
        setOpeningChatId(null);
      }
    } else {
    }
  };

  const deleteSession = async (id) => {
    setIsdeleting(true);
    const response = await fetch("/api/allchats/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: id }),
    });
    setIsdeleting(false);
  };
  const toggleLeftSideBar = () => {
    setIscollapsed((prev) => !prev);
  };
  const toggleNotifications = () => {
    setOpenNotifications((prev) => !prev);
  };
  const newChat = async () => {
    setNewChatLoading(true);
    const res = await fetch("/api/newchatsession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session?.user?.id,
        role: session?.user?.profileType,
      }),
    });
    const data = await res.json();
    if (data.success) updateChatId(data.sessionId);
    setNewChatLoading(false);
  };
  return (
    <>
      <div className="relative">
        <div className="absolute z-40 left-15 top-1/2">
          {openNotifications && (
            <Notification
              toggle={toggleNotifications}
              updateChatId={updateChatId}
              notifications={notifications}
            />
          )}
        </div>
        {!isCollapsed && (
          <div className="flex flex-col h-full w-64 p-4">
            <div className="flex-1 overflow-y-auto">
              <div className="flex justify-between mb-2">
                <p className="font-semibold">Your Chats</p>
                <button className="p-1" onClick={() => toggleLeftSideBar()}>
                  <img src="close-sidebar.png" width={20} />
                </button>
              </div>
              <div className="space-y-4">
                {allChats?.sessionIds?.length > 0 &&
                  allChats.sessionIds.map((id, idx) => (
                    <div className="flex w-full min-h-8 gap-2" key={id}>
                      <button
                        className={`text-slate-700 text-xs rounded-md px-2 py-2 border w-full
                    ${currentChatId === id && "bg-gray-100"}
                  `}
                        type="button"
                        onClick={() => updateChatId(id)}
                      >
                        {allChats?.sessions[id]?.title || `Chat ${idx + 1}`}
                      </button>
                      <button
                        onClick={() => {
                          fetchAllInbox(id);
                        }}
                      >
                        <img src="chat.png" width={16} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="flex gap-2 justify-center text-xs bg-white text-black w-full p-2  mt-2 rounded-md font-medium"
                onClick={() => newChat()}
              >
                <img src="new-chat.png" width={16} />
                {!newChatLoading ? "New Chat" : "Creating New Chat..."}
              </button>

              <button
                className="flex items-center gap-2 justify-center text-xs bg-white w-full p-2  rounded-md hover:bg-slate-50 transition-colors text-slate-700 border border-slate-200"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <img src="logout.png" width={16} />
                Sign Out
              </button>
              {session?.user?.isAdmin && (
                <button
                  className="flex items-center gap-2 justify-center text-xs bg-white w-full p-2  rounded-md hover:bg-slate-50 transition-colors text-slate-700 border border-slate-200"
                  onClick={() => router.push("/admin")}
                >
                  🛡️ Admin Dashboard
                </button>
              )}
              {/* show all chats */}
              {inboxLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-xs text-slate-500">
                    Loading inbox...
                  </span>
                </div>
              )}
              {!inboxLoading && inboxChats.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">No inbox chats found</p>
                </div>
              )}
              {!inboxLoading && inboxChats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Inbox Chats
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {inboxChats.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {inboxChats.map((chat) => (
                      <div
                        key={chat.userId}
                        className={`bg-white border border-slate-200 rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                          openingChatId === chat.userId
                            ? "border-blue-300 bg-blue-50"
                            : "hover:border-slate-300 hover:shadow-sm"
                        }`}
                        onClick={() => handleInboxChatClick(chat.userId)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  openingChatId === chat.userId
                                    ? "bg-blue-500"
                                    : "bg-green-500"
                                }`}
                              ></div>
                              <span className="text-xs font-medium text-slate-700 truncate">
                                {chat.connectionId}
                              </span>
                              {openingChatId === chat.userId && (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                              )}
                            </div>
                            <p className="text-sxs text-slate-600 line-clamp-2 leading-relaxed">
                              {chat.lastMessage || "No message"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                openingChatId === chat.userId
                                  ? "bg-blue-200 text-blue-800"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {chat.messageCount}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(
                                chat.lastMessageTime
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-12 px-4 py-2 flex flex-col  min-h-full  space-y-4">
            <div>
              <button onClick={() => toggleLeftSideBar()}>
                <img src="close-sidebar.png" width={20} />
              </button>
            </div>
            <div>
              <button
                onClick={() => {
                  (newChat(), setIscollapsed((prev) => !prev));
                }}
              >
                <img src="new-chat.png" width={22} />
              </button>
            </div>
            <div>
              <button onClick={() => setOpenNotifications((prev) => !prev)}>
                <img src="notification.png" width={20} />
              </button>
            </div>
        
          </div>
        )}
      </div>
    </>
  );
}
