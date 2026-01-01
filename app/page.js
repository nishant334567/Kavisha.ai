"use client";

import { useFirebaseSession } from "./lib/firebase/FirebaseSessionProvider";
import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import SelectChatType from "./components/SelectType";
import ChatBox from "./components/ChatBox";
import ChatSidebar from "./components/ChatSidebar";
import RightPanel from "./components/Rightpanel";
import Loader from "./components/Loader";
import { MessageCircleMore } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const [currentChatType, setCurrentChatType] = useState(null);
  const brandContext = useBrandContext();
  const [input, setInput] = useState("");
  const [currentChatId, setCurrentChatId] = useState(null);
  const [allChats, setAllchats] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [show, setShow] = useState(false);
  const [type, setType] = useState(1);
  const [viewData, setViewdata] = useState({});
  const [matches, setMatches] = useState([]);
  const [connections, setConnections] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [servicesProvided, setServicesProvided] = useState({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
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

    // For non-Kavisha brands, apply role-based filtering
    if (brandContext.subdomain !== "kavisha") {
      if (brandContext.isBrandAdmin) {
        // Admin: ONLY show recruiter service
        filteredServices = filteredServices.filter(
          (service) => service.name?.toLowerCase() === "recruiter"
        );
      } else {
        // Non-admin: Show all EXCEPT recruiter
        filteredServices = filteredServices.filter(
          (service) => service.name?.toLowerCase() !== "recruiter"
        );
      }
    }
    // For Kavisha brand: show all services (no filtering)

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

  const toggleRightPanel = () => {
    setShow((prev) => !prev);
  };

  const openDetailsPanel = (type, dataObject = {}) => {
    setType(type);
    type === 3 && setViewdata(dataObject);
    toggleRightPanel();
  };

  const selectChatType = async (
    type,
    initialMessage,
    isCommunityChat = false
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
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        setCurrentChatId(data.sessionId);
      }
    } catch (e) {
    } finally {
      setCreatingSession(false);
    }
  };

  if (loading) {
    return <Loader loadingMessage="Loading..." />;
  }

  // Middleware handles redirect for unauthenticated users
  if (!user) {
    return null;
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
            // onSidebarWidthChange={(w) => setSidebarWidth(w)}
          />
        </div>

        <div className="w-full h-full flex flex-col overflow-hidden">
          {!currentChatType && !currentChatId && (
            <SelectChatType
              servicesProvided={servicesProvided}
              selectedType={currentChatType}
              selectChatType={selectChatType}
              isCreating={creatingSession}
              enableCommunityOnboarding={
                brandContext?.enableCommunityOnboarding || false
              }
            />
          )}

          {currentChatId && (
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center px-4 md:px-0">
              <ChatBox
                currentChatId={currentChatId}
                currentChatType={currentChatType}
                updateChatId={setCurrentChatId}
                openDetailsPanel={openDetailsPanel}
                toggleRightPanel={toggleRightPanel}
                showInbox={showInbox}
                setShowInbox={setShowInbox}
              />
            </div>
          )}
        </div>
      </div>

      {show && (
        <div className="fixed top-0 right-0 z-40 w-72 bg-orange-50  overflow-y-auto scroll-auto scrollbar-none">
          {/* <p>Right Panel</p> */}
          <div>
            {show && type === 1 && (
              <RightPanel
                type={1}
                matches={matches}
                session={user}
                currentChatId={currentChatId}
                toggleRightPanel={toggleRightPanel}
              />
            )}
            {show && type === 2 && (
              <RightPanel
                type={2}
                connections={connections}
                session={user}
                currentChatId={currentChatId}
                toggleRightPanel={toggleRightPanel}
              />
            )}
            {show && type === 3 && (
              <RightPanel
                type={3}
                session={user}
                currentChatId={currentChatId}
                detailsObject={viewData}
                toggleRightPanel={toggleRightPanel}
              />
            )}
          </div>
        </div>
      )}

      {isSidebarCollapsed && (
        <button
          className="fixed top-28 left-0 z-40 w-10 h-10 flex items-center justify-center rounded-r text-[#59646F] shadow-xl border border-gray-300 hover:bg-[#59646F] hover:text-[#FFEED8] transition-colors"
          onClick={() => setShowInbox(true)}
          title="Open Inbox"
        >
          <MessageCircleMore className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
