"use client";

import { useEffect, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";

import Notification from "./Notification";
import { useSession, signOut } from "next-auth/react";

export default function Home({ initialChats, notifications }) {
  const [currentChatId, setCurrentchatid] = useState(
    initialChats?.sessionIds?.[0]
  );
  const [allChats, setAllchats] = useState(initialChats);
  const [messages, setMessages] = useState(initialChats?.sessionIds?.[0]?.logs);
  const [initialMatches, setInitialmatches] = useState(
    initialChats?.sessionIds?.[0]?.matchesLatest
  );
  const [openNotifications, setOpenNotifications] = useState(false);
  const [connections, setConnections] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/allchats");
      const data = await res.json();
      setMessages(data?.sessions[currentChatId]?.logs);
      setAllchats(data);
      setInitialmatches(data?.sessions[currentChatId]?.matchesLatest);
    };
    const fetchConnections = async () => {
      const resposne = await fetch(`/api/connections/${currentChatId}`);
      const data = await resposne.json();
      setConnections(data.connections);
    };
    fetchData();
    fetchConnections();
  }, [currentChatId]);

  const updateChatId = (chatId) => {
    setCurrentchatid(chatId);
    setShowSidebar(false); // Close sidebar on mobile after selecting chat
  };

  const toggleNotifications = () => {
    setOpenNotifications((prev) => !prev);
  };

  return (
    <div className="relative">
      {/* Mobile sidebar toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-200 p-2 rounded shadow"
        onClick={() => setShowSidebar((prev) => !prev)}
      >
        ☰ {/* Hamburger icon */}
      </button>
      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-3/4 bg-white shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatSidebar
              allChats={allChats}
              updateChatId={updateChatId}
              currentChatId={currentChatId}
            />
            <div className="flex flex-col gap-2 mt-4">
              <button
                className="text-xs bg-gray-100 w-full p-2 shadow-lg mt-2 rounded-md hover:bg-white hover:text-gray-500"
                onClick={async () => {
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
                }}
              >
                + New Chat
              </button>
              <button
                className="text-xs bg-gray-100 w-full p-2 shadow-lg rounded-md hover:bg-white hover:text-gray-500"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute -top-22 -right-5">
        <button
          onClick={() => setOpenNotifications((prev) => !prev)}
          className="flex shadow-md text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-md font-medium cursor-pointer hover:bg-gray-600 hover:text-gray-200"
        >
          <span className="hidden md:inline">Notifications </span>🔔
        </button>
        <div className="absolute z-40 -top-13 -right-30">
          {openNotifications && (
            <Notification
              toggle={toggleNotifications}
              updateChatId={updateChatId}
              notifications={notifications}
            />
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:flex justify-evenly gap-4">
        {/* Desktop sidebar */}
        <div className="w-[20%] md:w-[20%] hidden md:block">
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
          />
        </div>
        <div className="w-full xl:w-[70%]">
          <ChatBox
            connections={connections}
            initialMatches={initialMatches}
            currentChatId={currentChatId}
            initialMessages={messages}
          />
          {/* <Resume
            resumeData={resumeData}
            updateResume={updateResume}
            currentChatId={currentChatId}
          /> */}
        </div>
      </div>
    </div>
  );
}
