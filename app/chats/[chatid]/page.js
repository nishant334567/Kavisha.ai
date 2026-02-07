"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ChatBox from "@/app/components/ChatBox";
import ChatSidebar from "@/app/components/ChatSidebar";
import Loader from "@/app/components/Loader";
import PoweredByKavisha from "@/app/components/PoweredByKavisha";

export default function Chat() {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params.chatid;
  const { user, loading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const [allChats, setAllChats] = useState(null);
  const [currentChatType, setCurrentChatType] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [servicesProvided, setServicesProvided] = useState([]);
  const [creatingSession, setCreatingSession] = useState(false);

  // Same service filtering as main page
  useEffect(() => {
    if (!brandContext) return;
    setServicesProvided(brandContext.services || []);
  }, [brandContext]);

  // Fetch all chats
  useEffect(() => {
    if (!user || !brandContext) return;
    const fetchData = async () => {
      const endpoint =
        brandContext.subdomain === "kavisha"
          ? "/api/allchats"
          : `/api/allchats/${brandContext.subdomain}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setAllChats(data);
    };
    fetchData();
  }, [user, brandContext]);

  const selectChatType = async (
    type,
    initialMessage,
    isCommunityChat = false,
    name,
    serviceKey
  ) => {
    setCurrentChatType(type);
    if (!user || !brandContext) return;
    try {
      setCreatingSession(true);
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          role: type,
          brand: brandContext.subdomain,
          initialmessage: initialMessage,
          isCommunityChat: isCommunityChat,
          chatName: name,
          ...(serviceKey && { serviceKey }),
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        router.push(`/chats/${data.sessionId}`);
      }
    } catch (e) {
      console.error("Error creating chat session:", e);
    } finally {
      setCreatingSession(false);
    }
  };

  // Update chat ID handler for sidebar
  const updateChatId = (newChatId) => {
    if (newChatId) {
      router.push(`/chats/${newChatId}`);
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            setCurrentChatType={setCurrentChatType}
            onCollapsedChange={setIsSidebarCollapsed}
            servicesProvided={servicesProvided}
            onSelectService={selectChatType}
            isCreatingSession={creatingSession}
            defaultCollapsed={true}
          />
        </div>

        <div className="w-full h-full flex flex-col overflow-hidden">
          {currentChatId && (
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center px-4 md:px-0">
              <ChatBox currentChatId={currentChatId} />
            </div>
          )}
        </div>
      </div>
      <PoweredByKavisha />
    </div>
  );
}
