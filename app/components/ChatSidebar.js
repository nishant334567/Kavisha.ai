"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useState } from "react";
import Notification from "./Notification";
export default function ChatSidebar({
  allChats,
  updateChatId,
  currentChatId,
  notifications,
}) {
  const { data: session } = useSession();
  const [isDeleting, setIsdeleting] = useState(false);
  const [isCollapsed, setIscollapsed] = useState(true);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
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
              {/* <button
                className="flex items-center gap-2 justify-center text-xs bg-white w-full p-2  rounded-md hover:bg-slate-50 transition-colors text-slate-700 border border-slate-200"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/linkedin-auth-url");
                    const data = await response.json();
                    if (data.authUrl) {
                      window.location.href = data.authUrl;
                    } else {
                      console.error("Failed to get LinkedIn auth URL");
                    }
                  } catch (error) {
                    console.error("Error getting LinkedIn auth URL:", error);
                  }
                }}
              >
                <img src="logout.png" width={16} />
                Connect with Linkedin
              </button> */}
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-14 px-4 py-2 flex flex-col  min-h-full  space-y-4">
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
