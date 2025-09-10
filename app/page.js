"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import SelectChatType from "./components/SelectType";
import ChatBox from "./components/ChatBox";
import ChatSidebar from "./components/ChatSidebar";
import RightPanel from "./components/Rightpanel";
import getChatOptions from "./utils/getChatOptions";

export default function HomePage() {
  const { data: session } = useSession();
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
  useEffect(() => {
    if (!session || !brandContext) return;
    const key = `lastChat:${session.user.id}:${brandContext.brandName}`;
    const saved = localStorage.getItem(key);
    const key2 = `lastChatType:${session.user.id}`;
    const savedType = localStorage.getItem(key2);
    if (savedType && !currentChatType) setCurrentChatType(savedType);
    if (saved && !currentChatId) setCurrentChatId(saved);
  }, [brandContext]);

  useEffect(() => {
    if (!brandContext) return;
    setServicesProvided(brandContext.services);
  }, [brandContext]);
  useEffect(() => {
    if (!session || !brandContext) return;
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

    if (currentChatId) {
      const key = `lastChat:${session.user.id}:${brandContext.brandName}`;
      const key2 = `lastChatType:${session.user.id}`;
      localStorage.setItem(key, currentChatId);
      localStorage.setItem(key2, currentChatType);
    }
  }, [currentChatId, currentChatType]);

  const toggleRightPanel = () => {
    setShow((prev) => !prev);
  };

  const openDetailsPanel = (type, dataObject = {}) => {
    setType(type);
    type === 3 && setViewdata(dataObject);
    toggleRightPanel();
  };

  const selectChatType = async (type, initialMessage) => {
    setCurrentChatType(type);
    if (!session || !brandContext) return;

    try {
      setCreatingSession(true);
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          role: type,
          brand: brandContext.subdomain,
          initialmessage: initialMessage,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        setCurrentChatId(data.sessionId);
      }
    } catch (e) {
      console.error("Failed to create session on type select", e);
    } finally {
      setCreatingSession(false);
    }
  };

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex h-full overflow-hidden">
        <div style={{ width: sidebarWidth }}>
          <ChatSidebar
            allChats={allChats}
            updateChatId={setCurrentChatId}
            currentChatId={currentChatId}
            currentChatType={currentChatType}
            setCurrentChatType={setCurrentChatType}
            onOpenInbox={() => setShowInbox(true)}
            onSidebarWidthChange={(w) => setSidebarWidth(w)}
          />
        </div>

        <div className="w-full h-full flex flex-col">
          {!currentChatType && !currentChatId && (
            <SelectChatType
              servicesProvided={servicesProvided}
              selectedType={currentChatType}
              selectChatType={selectChatType}
              isCreating={creatingSession}
            />
          )}

          {currentChatId && (
            <ChatBox
              currentChatId={currentChatId}
              currentChatType={currentChatType}
              updateChatId={setCurrentChatId}
              openDetailsPanel={openDetailsPanel}
              toggleRightPanel={toggleRightPanel}
              showInbox={showInbox}
              setShowInbox={setShowInbox}
            />
          )}
        </div>
      </div>

      {show && (
        <div className="fixed top-0 right-0 z-40 w-72 bg-orange-50 h-screen h-full overflow-y-auto scroll-auto scrollbar-none">
          {/* <p>Right Panel</p> */}
          <div>
            {show && type === 1 && (
              <RightPanel
                type={1}
                matches={matches}
                session={session}
                currentChatId={currentChatId}
                toggleRightPanel={toggleRightPanel}
              />
            )}
            {show && type === 2 && (
              <RightPanel
                type={2}
                connections={connections}
                session={session}
                currentChatId={currentChatId}
                toggleRightPanel={toggleRightPanel}
              />
            )}
            {show && type === 3 && (
              <RightPanel
                type={3}
                session={session}
                currentChatId={currentChatId}
                detailsObject={viewData}
                toggleRightPanel={toggleRightPanel}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
