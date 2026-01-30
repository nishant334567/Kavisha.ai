"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ChatBox from "@/app/components/ChatBox";
import ChatSidebar from "@/app/components/ChatSidebar";
import CommunitySelectionDialog from "@/app/components/CommunitySelectionDialog";
import Loader from "@/app/components/Loader";

export default function CommunityChatPage() {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params.chatid;
  const { user, loading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const [allChats, setAllChats] = useState(null);
  const [currentChatType, setCurrentChatType] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  if (loading) return <Loader loadingMessage="Loading..." />;
  if (!user) return null;

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={currentChatId}
            setCurrentChatType={setCurrentChatType}
            onCollapsedChange={setIsSidebarCollapsed}
            isCommunity={true}
            onNewCommunityChat={() => setDialogOpen(true)}
            chatBasePath="/community"
            homePath="/community"
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
      <CommunitySelectionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
