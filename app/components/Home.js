"use client";

import { useEffect, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";
import Header from "./Header";

import { useSession, signOut } from "next-auth/react";

export default function Home({ initialChats, notifications }) {
  const [currentChatId, setCurrentchatid] = useState(
    initialChats?.sessionIds?.[0]
  );
  const [allChats, setAllchats] = useState(initialChats);
  const [messages, setMessages] = useState(initialChats?.sessionIds?.[0]?.logs);

  const [connections, setConnections] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/allchats");
      const data = await res.json();
      setMessages(data?.sessions[currentChatId]?.logs);
      setAllchats(data);
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

  return (
    <div className="relative">
      {/* <button
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-lg  hover:bg-blue-700 transition-colors border border-blue-600"
        onClick={() => setShowSidebar((prev) => !prev)}
      >
        ☰
      </button> */}

      {/* {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-3/4 bg-white p-4 border-r border-r-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatSidebar
              allChats={allChats}
              updateChatId={updateChatId}
              currentChatId={currentChatId}
            />
            <div className="flex flex-col gap-2 mt-4">
              <button
                className="text-xs bg-blue-600 text-white w-full p-3  mt-2 rounded-md hover:bg-blue-700 transition-colors border border-blue-600 font-medium"
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
                className="text-xs bg-white w-full p-2  rounded-md hover:bg-slate-50 transition-colors text-slate-700 border border-slate-200"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )} */}
      <div className="flex gap-4 w-screen">
        {/* Desktop sidebar */}
        <div className="left-0 h-[100vh] bg-orange-50 border-r border-r-gray-200">
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            notifications={notifications}
          />
        </div>
        <div className="flex-col items-center justify-center mx-auto h-full md:w-[60%]">
          <div className="py-2">
            <Header />
          </div>
          <ChatBox
            connections={connections}
            currentChatId={currentChatId}
            initialMessages={messages}
          />
        </div>
      </div>
    </div>
  );
}
