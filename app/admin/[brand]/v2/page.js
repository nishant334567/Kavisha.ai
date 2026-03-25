"use client";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircleMore } from "lucide-react";
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
  const primaryButtons = [
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
    {
      label: "Revenue",
      path: `/admin/${brand?.subdomain}/revenue`,
    },
  ];
  const featureButtons = [
    ...(brand?.enableBooking
      ? [
          {
            label: "Booking Services",
            path: `/admin/services?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
          },
        ]
      : []),
    ...(brand?.enableQuiz
      ? [
          {
            label: "Quizzes/Survey",
            path: `/admin/quiz`,
            count: countsLoading ? <LoadingDots /> : quizSurveyAttemptCount,
          },
        ]
      : []),
    ...(brand?.enableProducts
      ? [
          {
            label: "Store",
            path: `/admin/products?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
          },
        ]
      : []),
    ...(brand?.enableJobs
      ? [
          {
            label: "My Jobs",
            path: `/admin/jobs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
          },
        ]
      : []),
    ...(brand?.enableBlogs
      ? [
          {
            label: "Blog",
            path: `/admin/blogs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
          },
        ]
      : []),
    {
      label: "Links",
      path: `/admin/links?subdomain=${encodeURIComponent(brand?.subdomain || "")}`,
    },
  ];
  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col bg-background text-foreground">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center text-center">
          <p className="px-4 font-zen text-5xl text-highlight md:text-6xl">
            Welcome, {brand?.brandName?.split(" ")?.[0]} !
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 font-akshar">
          <div className="flex flex-wrap items-center justify-center gap-y-3">
            {primaryButtons.map((button, index) => (
              <div key={button.label} className="flex items-center">
                {index > 0 && <div className="mx-1 h-6 w-px self-center bg-border" />}
                <button
                  onClick={() => go(button.path)}
                  className="text-md flex items-center gap-2 bg-transparent px-4 py-2 uppercase text-foreground md:text-2xl"
                >
                  {button.label}
                  <span className="min-w-[2ch] rounded bg-muted-bg px-2 py-0.5 text-sm font-normal text-muted md:text-base">
                    {button.count}
                  </span>
                </button>
              </div>
            ))}
          </div>
          {featureButtons.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-[0.3em] text-muted">
                Featured Services
              </div>
              <div className="flex flex-wrap items-center justify-center gap-y-3">
                {featureButtons.map((button, index) => (
                  <div key={button.label} className="flex items-center">
                    {index > 0 && <div className="mx-1 h-6 w-px self-center bg-border" />}
                    <button
                      onClick={() => go(button.path)}
                      className="text-md flex items-center gap-2 bg-transparent px-4 py-2 uppercase text-foreground md:text-2xl"
                    >
                      {button.label}
                      {button.count ? (
                        <span className="min-w-[2ch] rounded bg-muted-bg px-2 py-0.5 text-sm font-normal text-muted md:text-base">
                          {button.count}
                        </span>
                      ) : null}
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
        <div className="text-sm font-akshar text-muted">
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
        className="fixed bottom-4 right-4 z-40 rounded-full bg-card p-3 text-foreground shadow-lg transition-colors hover:bg-muted-bg sm:hidden"
        onClick={() => {
          setShowInbox(true);
        }}
      >
        <MessageCircleMore className="w-6 h-6" />
      </button>

      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 md:items-end md:justify-end md:bg-transparent">
          {/* Desktop: Show chat to the left of inbox if open */}
          {openChat && userA && userB && (
            <div className="hidden md:flex md:mr-4 md:mb-6">
              <div className="flex h-[80vh] w-[500px] flex-col overflow-hidden border border-border bg-card shadow-2xl">
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
          <div className="flex h-full w-full flex-col overflow-hidden border border-border bg-card shadow-2xl md:mx-0 md:mb-6 md:mr-6 md:h-auto md:max-h-[60vh] md:w-80">
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
