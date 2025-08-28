"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Header from "./Header";
import { useEffect, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";
import { useSession } from "next-auth/react";
export default function Hone() {
  const [currentChatId, setCurrentchatid] = useState(null);
  const brandContext = useBrandContext();
  const { data: session } = useSession();
  const [allChats, setAllChats] = useState({ sessionIds: [], sessions: {} });
  const [showSidebar, setShowSidebar] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch("/api/allchats");
      const data = await response.json();
    };
    fetchData();
  }, []);

  const updateChatId = (chatId) => {
    setCurrentchatid(chatId);
    setShowSidebar(false); // Close sidebar on mobile after selecting chat
  };
  const [input, setInput] = useState("");
  if (!brandContext) {
    return <div>Loading brand context...</div>;
  }
  const { brandName, isBrandAdmin } = brandContext;
  const getBrandSpecificContent = () => {
    if (brandName === "Kavisha") {
      return <p>Welcome to Kavisha - Choose your journey</p>;
    }
    return (
      <div>
        <p>Welcome to {brandName}</p>
        <p>Role: {isBrandAdmin ? "Recruiter" : "Job Seeker"}</p>
      </div>
    );
  };

  // Then in your JSX:
  return (
    <div>
      <div className="absolute z-40 left-0 h-[100vh] bg-orange-50 border-r border-r-gray-200">
        <ChatSidebar
          allChats={allChats}
          updateChatId={updateChatId}
          currentChatId={currentChatId}
          //   notifications={notifications}
        />
      </div>
      <Header />
      {getBrandSpecificContent()}
      {currentChatId && (
        <ChatBox
          currentChatId={currentChatId}
          //   initialMessages={messages}
          //   chatLoading={chatLoading}
          //   openDetailsPanel={openDetailsPanel}
          // initialMatches = {matches}
        />
      )}
      <div className="flex h-[100px] w-[70%] mx-auto bg-pink-200">
        <textarea
          className="bg-pink-400 w-full border border-slate-300 
          rounded rounded-xl focus:border-orange-300 
          transition bg-white text-slate-800 pl-12 resize-none scrollbar-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          rows={2}
          style={{ minHeight: "100px" }}
        />
      </div>
    </div>
  );
}
