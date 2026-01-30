"use client";
import { useFirebaseSession } from "./lib/firebase/FirebaseSessionProvider";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { redirect, useRouter } from "next/navigation";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import SelectChatType from "./components/SelectType";
import ChatBox from "./components/ChatBox";
import ChatSidebar from "./components/ChatSidebar";
import Loader from "./components/Loader";
import Homepage from "./components/Homepage";
import AvatarHomepage from "./components/AvatarHomepage";

export default function HomePage() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter()
  const [currentChatType, setCurrentChatType] = useState(null);
  const brandContext = useBrandContext();

  const [currentChatId, setCurrentChatId] = useState(null);
  const [allChats, setAllchats] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [creatingForServiceKey, setCreatingForServiceKey] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [servicesProvided, setServicesProvided] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);



  useLayoutEffect(() => {
    if (loading || !user || !brandContext) {
      return;
    }
    const redirectPath = typeof window !== "undefined" ? localStorage.getItem("redirectAfterLogin") : null;

    if (redirectPath) {
      // Validate that redirectPath is a valid string path
      const path = typeof redirectPath === "string" && redirectPath.startsWith("/")
        ? redirectPath
        : null;

      if (path) {
        localStorage.removeItem("redirectAfterLogin");
        router.replace(path);
        return;
      } else {
        // Clean up invalid redirect path
        localStorage.removeItem("redirectAfterLogin");
      }
    }
  }, [user, loading, brandContext, router]);


  useEffect(() => {
    if (!user || !brandContext) return;
    const key = `lastChat:${user.id}:${brandContext.brandName}`;
    const saved = localStorage.getItem(key);
    const key2 = `lastChatType:${user.id}`;
    const savedType = localStorage.getItem(key2);
    if (savedType && !currentChatType) setCurrentChatType(savedType);
    if (saved && !currentChatId) setCurrentChatId(saved);
  }, []);

  useEffect(() => {
    if (!brandContext) return;
    let filteredServices = brandContext.services || [];

    if (brandContext.subdomain !== "kavisha") {
      if (brandContext.isBrandAdmin) {
        filteredServices = filteredServices.filter(
          (service) => service.name?.toLowerCase() === "recruiter"
        );
      } else {
        filteredServices = filteredServices.filter(
          (service) => service.name?.toLowerCase() !== "recruiter"
        );
      }
    }

    setServicesProvided(filteredServices);
  }, [brandContext]);
  useEffect(() => {
    if (!user || !brandContext) return;
    const fetchData = async () => {
      const endpoint =
        brandContext.subdomain === "kavisha"
          ? "/api/allchats"
          : `/api/allchats/${brandContext.subdomain}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setAllchats(data);
    };
    fetchData();
  }, [user, brandContext]);

  useEffect(() => {
    if (!user || !brandContext || !currentChatId) return;
    const key = `lastChat:${user.id}:${brandContext.brandName}`;
    const key2 = `lastChatType:${user.id}`;
    localStorage.setItem(key, currentChatId);
    localStorage.setItem(key2, currentChatType);
  }, [currentChatId, currentChatType, user, brandContext]);

  const selectChatType = async (
    type,
    initialMessage,
    isCommunityChat = false,
    name,
    serviceKey
  ) => {
    setCurrentChatType(type);
    setCreatingForServiceKey(serviceKey || null);
    if (!user || !brandContext) {
      setCreatingForServiceKey(null);
      return;
    }

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
        setCurrentChatId(data.sessionId);
        // Redirect to the new chat
        router.push(`/chats/${data.sessionId}`);
      }
    } catch (e) {
      console.error("Error creating chat session:", e);
    } finally {
      setCreatingSession(false);
    }
  };

  useEffect(() => {
    if (user && brandContext?.isBrandAdmin) {
      router.push(`/admin/${brandContext.subdomain}/v2`);
    }
  }, [user, brandContext, router]);

  if (loading) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!user) {
    if (!brandContext) {
      return <Loader loadingMessage="Loading..." />;
    }
    if (brandContext.subdomain === "kavisha") {
      return <Homepage />;
    }
    return <AvatarHomepage />;
  }

  // Don't render chat interface for admins (they'll be redirected)
  if (brandContext?.isBrandAdmin) {
    return <Loader loadingMessage="Redirecting to admin dashboard..." />;
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={setCurrentChatId}
            currentChatId={currentChatId}
            currentChatType={currentChatType}
            setCurrentChatType={setCurrentChatType}
            onOpenInbox={() => setShowInbox(true)}
            onCollapsedChange={setIsSidebarCollapsed}
          />
        </div>

        <div className="w-full h-full flex flex-col overflow-hidden">
          <SelectChatType
            servicesProvided={servicesProvided}
            selectedType={currentChatType}
            selectChatType={selectChatType}
            isCreating={creatingSession}
            creatingForServiceKey={creatingForServiceKey}
            enableCommunityOnboarding={
              brandContext?.enableCommunityOnboarding || false
            }
            communityName={brandContext?.communityName || ""}
            enableQuiz={brandContext?.enableQuiz || false}
            quizName={brandContext?.quizName || ""}
          />

          {currentChatId && (
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center px-4 md:px-0">
              <ChatBox
                currentChatId={currentChatId}
                currentChatType={currentChatType}
                updateChatId={setCurrentChatId}
                showInbox={showInbox}
                setShowInbox={setShowInbox}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
