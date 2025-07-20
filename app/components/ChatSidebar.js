"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { useState } from "react";

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
                  className={`text-slate-700 text-xs rounded-md px-2 py-2 shadow-lg w-full hover:bg-blue-100 transition-colors border
                    ${currentChatId === id ? "bg-blue-600 font-bold text-white border-blue-600" : "bg-white border-slate-200"}
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
          className="text-xs bg-blue-600 text-white w-full p-3 shadow-lg mt-2 rounded-md hover:bg-blue-700 transition-colors border border-blue-600 font-medium"
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
          className="text-xs bg-white w-full p-2 shadow-lg rounded-md hover:bg-slate-50 transition-colors text-slate-700 border border-slate-200"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign Out
        </button>
        <button
          onClick={() => signIn("linkedin", { callbackUrl: "/" })}
          className="text-xs bg-blue-600 w-full p-2 shadow-lg rounded-md hover:bg-blue-700 transition-colors text-white border border-blue-600"
        >
          Connect with Linkedin
        </button>
      </div>
    </div>
  );
}
