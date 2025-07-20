"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useState, } from "react";


export default function ChatSidebar({ allChats, updateChatId, currentChatId }) {
  const { data: session } = useSession();
  const [isDeleting, setIsdeleting] = useState(false);
  const deleteSession = async (id) => {
    setIsdeleting(true);
    const response = await fetch("/api/allchats/", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: id }),
    });
    setIsdeleting(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* <h2>Your Chats</h2> */}
        <div className="space-y-4">
          {allChats?.sessionIds?.length > 0 &&
            allChats.sessionIds.map((id, idx) => (
              <div className="flex w-full min-h-8 gap-2" key={id}>
                <button
                  className={`text-slate-700 text-xs rounded-md px-2 py-2 shadow-lg w-full hover:bg-slate-300 transition-colors
                    ${currentChatId === id ? "bg-blue-600 font-bold text-white" : "bg-slate-100"}
                  `}
                  type="button"
                  onClick={() => updateChatId(id)}
                >
                  {allChats?.sessions[id]?.title || `Chat ${idx + 1}`}
                </button>
                {/* <button
                  onClick={() => {
                    deleteSession(id);
                  }}
                >
                  <img src="delete_2.png" width={20} height={20} />
                </button> */}
              </div>
            ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
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
          className="text-xs bg-slate-100 w-full p-2 shadow-lg rounded-md hover:bg-slate-200 transition-colors text-slate-700"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign Out
        </button>
        <button
          onClick={() => signIn("linkedin", { callbackUrl: "/" })}
          className="text-xs bg-blue-600 w-full p-2 shadow-lg rounded-md hover:bg-blue-700 transition-colors text-white"
        >
          Connect with Linkedin
        </button>
      </div>
    </div>
  );
}
