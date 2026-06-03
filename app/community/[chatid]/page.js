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
    }
  };

  if (loading || !brandContext) {
    return (
      <Loader
        loadingMessage="Loading..."
        primaryHex={
          brandContext
            ? normalizeBrandHex(brandContext.primaryBrandColor)
            : null
        }
      />
    );
  }
  if (!user) return null;

  const primaryHex = normalizeBrandHex(brandContext?.primaryBrandColor);

  return (
    <div className="chat-thread-mobile-dock md:relative md:flex md:h-[calc(100vh-64px)] md:min-h-[calc(100vh-64px)] md:max-h-none md:flex-col md:overflow-hidden">
      <CommunityBrandStrip
        communityName={brandContext?.communityName || "Community"}
        primaryHex={primaryHex}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            setCurrentChatType={setCurrentChatType}
            onCollapsedChange={() => {}}
            isCommunity={true}
            onNewCommunityChat={createCommunityPost}
            chatBasePath="/community"
            homePath="/community"
            defaultCollapsed={true}
          />
        </div>
        <div className="w-full h-full flex flex-col overflow-hidden">
          {currentChatId && (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-2 md:px-0">
              <ChatBox
                currentChatId={currentChatId}
                showPoweredByFooter
              />
            </div>
          )}
        </div>
      </div>
      <PoweredByKavisha className="hidden shrink-0 md:block md:pt-0.5 md:pb-1" />
    </div>
  );
}
