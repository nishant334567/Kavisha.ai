"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { ChevronDown, User, MessageCircleMore } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useState, useEffect } from "react";
import Inbox from "@/app/components/Inbox";
import Livechat from "@/app/components/LiveChat";

const LoadingDots = () => (
  <span className="inline-flex gap-0.5 items-center">
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots" />
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots [animation-delay:0.2s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-loading-dots [animation-delay:0.4s]" />
  </span>
);

export default function AdminHome() {
  const router = useRouter();
  const brand = useBrandContext();
  const [openChat, setOpenChat] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [chatRequestCount, setChatRequestCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [quizSurveyAttemptCount, setQuizSurveyAttemptCount] = useState(0);
  const [countsLoading, setCountsLoading] = useState(true);
  const go = (path) => router.push(path);
  const { user } = useFirebaseSession();

  useEffect(() => {
    const fetchCounts = async () => {
      if (brand?.subdomain) {
        setCountsLoading(true);
        try {
          const response = await fetch(
            `/api/admin/fetch-sessions?brand=${brand.subdomain}&count=true`
          );
          const data = await response.json();
          if (data.success) {
            setChatRequestCount(data.chatRequestCount || 0);
            setCommunityCount(data.communityCount || 0);
            setQuizSurveyAttemptCount(data.quizSurveyAttemptCount || 0);
          }
        } catch (error) {
          console.error("Failed to fetch counts:", error);
        } finally {
          setCountsLoading(false);
        }
      } else {
        setCountsLoading(false);
      }
    };
    fetchCounts();
  }, [brand?.subdomain]);
  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat(true);
    // On mobile, close inbox when opening chat. On desktop, keep both open.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowInbox(false);
    }
  };
  const topButtons = [
    {
      label: "Chat Requests",
      path: `/admin/${brand?.subdomain}/chat-requests`,
      count: countsLoading ? <LoadingDots /> : chatRequestCount,
    },
    {
      label: "Community",
      path: `/admin/${brand?.subdomain}/my-community`,
      count: countsLoading ? <LoadingDots /> : communityCount,
    },
    ...(brand?.enableQuiz
      ? [
          {
            label: "Quizzes/Survey",
            path: `/admin/quiz`,
            count: countsLoading ? <LoadingDots /> : quizSurveyAttemptCount,
          },
        ]
      : []),
  ];
  const bottomButtons = [
    {
      label: "Revenue",
      path: `/admin/${brand?.subdomain}/revenue`,
    },
  ];
  return (
    <div className="relative flex flex-col h-[calc(100vh-56px)] bg-white">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center text-center">
          <p className="font-zen text-[#000A67] text-5xl md:text-6xl px-4">
            Welcome, {brand?.brandName?.split(" ")?.[0]} !
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 font-akshar">
          <div className="flex flex-wrap items-center justify-center gap-y-3">
            {topButtons.map((button, index) => (
              <div key={button.label} className="flex items-center">
                {index > 0 && <div className="mx-1 h-6 w-px bg-gray-300 self-center" />}
                <button
                  onClick={() => go(button.path)}
                  className="uppercase px-4 py-2 text-gray-800 bg-transparent text-md md:text-2xl flex items-center gap-2"
                >
                  {button.label}
                  <span className="bg-gray-200 text-gray-700 text-sm md:text-base px-2 py-0.5 rounded font-normal min-w-[2ch]">
                    {button.count}
                  </span>
                </button>
              </div>
            ))}
          </div>
          {bottomButtons.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-y-3">
                {bottomButtons.map((button, index) => (
                  <div key={button.label} className="flex items-center">
                    {index > 0 && <div className="mx-1 h-6 w-px bg-gray-300 self-center" />}
                    <button
                      onClick={() => go(button.path)}
                      className="uppercase px-4 py-2 text-gray-800 bg-transparent text-md md:text-2xl flex items-center gap-2"
                    >
                      {button.label}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
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
          {/* Desktop: Show chat to the left of inbox if open */}
          {openChat && userA && userB && (
            <div className="hidden md:flex md:mr-4 md:mb-6">
              <div className="bg-white w-[500px] h-[80vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
                <Livechat
                  userA={userA}
                  userB={userB}
                  currentUserId={user?.id}
                  onClose={() => setOpenChat(false)}
                  connectionId={connectionId}
                  isEmbedded={true}
                />
              </div>
            </div>
          )}
          {/* Inbox - always at bottom right on desktop */}
          <div className="w-full h-full md:w-80 md:h-auto md:max-h-[60vh] md:mx-0 md:mr-6 md:mb-6 overflow-hidden shadow-2xl bg-white border border-slate-200 flex flex-col">
            <Inbox
              onOpenChat={openChatSession}
              onClose={() => setShowInbox(false)}
            />
          </div>
        </div>
      )}
      {/* Mobile: Show chat full screen when open and inbox is closed */}
      {openChat && userA && userB && !showInbox && (
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
