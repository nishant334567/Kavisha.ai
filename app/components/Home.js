"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";
import Header from "./Header";
import RighPanel from "./Rightpanel";
import LiveChat from "./LiveChat";
import Inbox from "./Inbox";

export default function Home({ initialChats, notifications }) {
  const { data: session } = useSession();

  // Safety checks for undefined data
  const safeInitialChats = initialChats || { sessionIds: [], sessions: {} };
  const safeNotifications = notifications || [];

  const [currentChatId, setCurrentchatid] = useState(
    safeInitialChats?.sessionIds?.[0] || null
  );
  const [allChats, setAllchats] = useState(safeInitialChats);
  const [messages, setMessages] = useState(
    safeInitialChats?.sessionIds?.[0]
      ? safeInitialChats.sessions[safeInitialChats.sessionIds[0]]?.logs || []
      : []
  );

  const [connections, setConnections] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [matches, setMatches] = useState([]);
  const [chatLoading, setChatsLoading] = useState(true); // Start with true since we need to fetch
  const [chatError, setChatError] = useState(false);
  const [show, setShow] = useState(false);
  const [type, setType] = useState(1);
  const [viewData, setViewdata] = useState({});

  // Client-side data fetching
  const fetchData = async () => {
    setChatsLoading(true);
    setChatError(false);
    try {
      const res = await fetch("/api/allchats");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();

      // Set the chats data
      setAllchats(data);
      // Update currentChatId if it's not set and we have sessions
      if (!currentChatId && data?.sessionIds?.length > 0) {
        const firstChatId = data.sessionIds[0];
        setCurrentchatid(firstChatId);

        // Set messages for the first chat
        const firstChatMessages = data?.sessions[firstChatId]?.logs || [];
        setMessages(firstChatMessages);
      } else if (currentChatId) {
        // Set messages for the current chat
        const currentChatMessages = data?.sessions[currentChatId]?.logs || [];
        setMessages(currentChatMessages);
      }

      setChatError(false);
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChatError(true);
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

  useEffect(() => {
    // Fetch initial data
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
      {/* Floating Inbox on bottom right for desktop */}

      {/* Inbox LiveChat Modal */}
      {/* {showInboxChat && inboxChatData && (
        <LiveChat chatData={inboxChatData} onClose={handleCloseInboxChat} />
      )} */}
    </div>
  );
}
