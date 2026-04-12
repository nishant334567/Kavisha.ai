"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ChatBox from "@/app/components/ChatBox";
import ChatSidebar from "@/app/components/ChatSidebar";
import CommunityBrandStrip from "@/app/components/CommunityBrandStrip";
import Loader from "@/app/components/Loader";
import PoweredByKavisha from "@/app/components/PoweredByKavisha";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

export default function CommunityChatPage() {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params.chatid;
  const { user, loading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const [allChats, setAllChats] = useState(null);
  const [currentChatType, setCurrentChatType] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    if (!user || !brandContext) return;
    const endpoint =
      brandContext.subdomain === "kavisha"
        ? "/api/allchats?community=true"
        : `/api/allchats/${brandContext.subdomain}?community=true`;
    fetch(endpoint).then((res) => res.json()).then(setAllChats);
  }, [user, brandContext]);

  const updateChatId = (newChatId) => {
    if (newChatId) router.push(`/community/${newChatId}`);
    else router.push("/community");
  };

  const createCommunityPost = async (type, title, message) => {
    if (!user?.id || !brandContext?.subdomain) return;

    const services = brandContext?.services || [];
    const service = services.find((s) => s.name === type);
    const serviceKey = service?._key ?? services[0]?._key;
    if (!serviceKey) return;

    setCreating(type);
    try {
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: type,
          brand: brandContext.subdomain,
          initialmessage: message,
          isCommunityChat: true,
          chatName: title,
          serviceKey,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        router.push(`/community/${data.sessionId}`);
      }
    } catch (e) {
      console.error("Error creating community session:", e);
    } finally {
      setCreating(null);
    }
  };

  if (loading || !brandContext) return <Loader loadingMessage="Loading..." />;
  if (!user) return null;

  const primaryHex = normalizeBrandHex(brandContext?.primaryBrandColor);
  const findJobsMsg =
    "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can be done. :)";
  const hireMsg =
    "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)";
  const friendsMsg =
    "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)";

  return (
    <div className="min-h-[calc(100vh-64px)] h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <CommunityBrandStrip
        communityName={brandContext?.communityName || "Community"}
        primaryHex={primaryHex}
        enableProfessionalConnect={!!brandContext?.enableProfessionalConnect}
        enableFriendConnect={!!brandContext?.enableFriendConnect}
        creating={creating}
        onFindJobs={() =>
          createCommunityPost("job_seeker", "Looking for work", findJobsMsg)
        }
        onHirePeople={() =>
          createCommunityPost("recruiter", "Looking at hiring", hireMsg)
        }
        onFindFriends={() =>
          createCommunityPost("friends", "Looking for a friend", friendsMsg)
        }
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            setCurrentChatType={setCurrentChatType}
            onCollapsedChange={setIsSidebarCollapsed}
            isCommunity={true}
            onNewCommunityChat={createCommunityPost}
            chatBasePath="/community"
            homePath="/community"
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
