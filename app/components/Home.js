"use client";

import { useEffect, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";
import Header from "./Header";
import RighPanel from "./Rightpanel";
import { useSession } from "next-auth/react";

export default function Home({ initialChats, notifications }) {
  const { data: session } = useSession();
  const [currentChatId, setCurrentchatid] = useState(
    initialChats?.sessionIds?.[0]
  );
  const [allChats, setAllchats] = useState(initialChats);
  const [messages, setMessages] = useState(initialChats?.sessionIds?.[0]?.logs);

  const [connections, setConnections] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [matches, setMatches] = useState([]);
  const [chatLoading, setChatsLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [type, setType] = useState(0);
  const [viewData, setViewdata] = useState({});
  useEffect(() => {
    const fetchData = async () => {
      setChatsLoading(true);
      try {
        const res = await fetch("/api/allchats");
        const data = await res.json();
        setMessages(data?.sessions[currentChatId]?.logs);
        setAllchats(data);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setChatsLoading(false);
      }
    };

    const fetchConnections = async () => {
      if (!currentChatId) return;
      try {
        const response = await fetch(`/api/connections/${currentChatId}`);
        const data = await response.json();
        setConnections(data.connections);
      } catch (error) {
        console.error("Error fetching connections:", error);
      }
    };

    const fetchMatches = async () => {
      if (!currentChatId) return;
      try {
        const response = await fetch(`/api/fetch-matches/${currentChatId}`);
        const data = await response.json();
        setMatches(data?.matches);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchData();
    fetchConnections();
    fetchMatches();
  }, [currentChatId]);

  const updateChatId = (chatId) => {
    setCurrentchatid(chatId);
    setShowSidebar(false); // Close sidebar on mobile after selecting chat
  };

  const toggleRightPanel = () => {
    setShow((prev) => !prev);
  };
  const openDetailsPanel = (type, dataObject = {}) => {
    setType(type);
    type === 3 && setViewdata(dataObject);
    toggleRightPanel();
  };
  return (
    <div className="relative">
      <div className="relative flex gap-4 w-screen">
        <div className="absolute z-40 left-0 h-[100vh] bg-orange-50 border-r border-r-gray-200">
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            notifications={notifications}
          />
        </div>
        <div className="flex-col w-[80%] items-center justify-center mx-auto h-full md:w-[60%]">
          <div className="py-2">
            <Header />
          </div>
          <ChatBox
            connections={connections}
            currentChatId={currentChatId}
            initialMessages={messages}
            chatLoading={chatLoading}
            openDetailsPanel={openDetailsPanel}
            // initialMatches = {matches}
          />
        </div>
        {show && (
          <div className="fixed right-0 z-40 w-64 bg-orange-50 h-screen max-h-screen overflow-y-auto scroll-auto scrollbar-none">
            {/* <p>Right Panel</p> */}
            <div>
              {show && type === 1 && (
                <RighPanel
                  type={1}
                  matches={matches}
                  session={session}
                  currentChatId={currentChatId}
                  toggleRightPanel={toggleRightPanel}
                />
              )}
              {show && type === 2 && (
                <RighPanel
                  type={2}
                  connections={connections}
                  session={session}
                  currentChatId={currentChatId}
                  toggleRightPanel={toggleRightPanel}
                />
              )}
              {show && type === 3 && (
                <RighPanel
                  type={3}
                  session={session}
                  currentChatId={currentChatId}
                  detailsObject={viewData}
                  toggleRightPanel={toggleRightPanel}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
