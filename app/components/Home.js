"use client";

import { useEffect, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";
import Resume from "./Resume";
import Notification from "./Notification";

export default function Home({ initialChats, notifications }) {
  const [currentChatId, setCurrentchatid] = useState(
    initialChats?.sessionIds?.[0]
  );
  const [allChats, setAllchats] = useState(initialChats);
  const [messages, setMessages] = useState(initialChats?.sessionIds?.[0]?.logs);
  const [initialMatches, setInitialmatches] = useState(
    initialChats?.sessionIds?.[0]?.matchesLatest
  );
  const [resumeData, setResumedata] = useState({});
  const [openNotifications, setOpenNotifications] = useState(false);
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/allchats");
      const data = await res.json();
      setMessages(data?.sessions[currentChatId]?.logs);
      setAllchats(data);
      setInitialmatches(data?.sessions[currentChatId]?.matchesLatest);
      setResumedata({
        filename: data?.sessions[currentChatId]?.resumeFilename,
        resumeSummary: data?.sessions[currentChatId]?.resumeSummary,
      });
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
    console.log("Triggered ");
    setCurrentchatid(chatId);
  };

  const updateResume = (filename, summary) => {
    setResumedata({ filename: filename, resumeSummary: summary });
  };

  const toggleNotifications = () => {
    setOpenNotifications((prev) => !prev);
  };

  return (
    <div className="relative">
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
        <div className="w-[20%] md:w-[20%] hidden md:block">
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
          />
        </div>
        <div className="w-full md:w-[70%]">
          <Resume
            resumeData={resumeData}
            updateResume={updateResume}
            currentChatId={currentChatId}
          />

          <ChatBox
            connections={connections}
            initialMatches={initialMatches}
            currentChatId={currentChatId}
            initialMessages={messages}
            resumeText={resumeData.resumeSummary}
          />
        </div>
        {/* <div>
          <button className="w-full px-2 py-1 rounded-sm shadow-md text-xs">
            Show Matches
          </button>
          <button className="w-full px-2 py-1 rounded-sm shadow-md text-xs">
            Connection Requests
          </button>
        </div> */}
      </div>
    </div>
  );
}
