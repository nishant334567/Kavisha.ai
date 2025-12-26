"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { ChevronDown, User, MessageCircleMore } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useState } from "react";
import Inbox from "@/app/components/Inbox";
import Livechat from "@/app/components/LiveChat";

export default function AdminHome() {
  const router = useRouter();
  const brand = useBrandContext();
  const [openChat, setOpenChat] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const go = (path) => router.push(path);
  const { user } = useFirebaseSession();
  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };
  return (
    <div className="relative flex flex-col h-[calc(100vh-56px)] bg-white">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center text-center">
          <p className="font-zen text-[#000A67] text-5xl md:text-6xl px-4">
            Welcome, {brand?.brandName?.split(" ")?.[0]} !
          </p>
        </div>
        <div className="mt-8 flex items-center justify-center gap-4 font-akshar">
          <button
            onClick={() => go(`/admin/${brand?.subdomain}/chat-requests`)}
            className="uppercase px-4 py-2 text-gray-800 bg-transparent text-md md:text-2xl"
          >
            Chat Requests
          </button>
          <div className="w-px h-6 bg-gray-300 self-center"></div>
          <button
            onClick={() => go(`/admin/${brand?.subdomain}/my-community`)}
            className="uppercase px-4 py-2 text-gray-800 bg-transparent text-md md:text-2xl"
          >
            Your Community
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className=" h-12 flex items-center justify-center px-6">
        <div className="text-gray-700 text-sm font-akshar">
          Powered by KAVISHA
        </div>
      </div>
      {/* Desktop Messaging Button */}
      <div
        className="hidden sm:flex absolute bottom-0 right-0 justify-between shadow-lg px-4 py-2 mb-4 mr-4"
        onClick={() => {
          setShowInbox(true);
        }}
      >
        <div className="flex justify-between items-center pr-2">
          <img
            src="/avatar.png"
            alt="Avatar"
            className="w-6 h-6 rounded-full"
          />
        </div>
        <p className="pl-2 pr-12 font-akshar">Messaging</p>
        <ChevronDown />
      </div>

      {/* Mobile Messaging Button */}
      <button
        className="sm:hidden fixed bottom-4 right-4 text-black  p-3 rounded-full shadow-lg hover:bg-gray-300 transition-colors z-40"
        onClick={() => {
          setShowInbox(true);
        }}
      >
        <MessageCircleMore className="w-6 h-6" />
      </button>

      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:items-end md:justify-end bg-black bg-opacity-30 md:bg-transparent">
          <div className="w-full max-w-sm mx-auto md:mx-0 md:mr-6 md:mb-6 md:w-80 md:max-h-[60vh] overflow-y-auto shadow-2xl rounded-xl bg-white border border-slate-200">
            <Inbox
              onOpenChat={openChatSession}
              onClose={() => setShowInbox(false)}
            />
          </div>
        </div>
      )}
      {openChat && userA && userB && (
        <Livechat
          userA={userA}
          userB={userB}
          currentUserId={user?.id}
          onClose={() => setOpenChat(false)}
          connectionId={connectionId}
        />
      )}
    </div>
  );
}
