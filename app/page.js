"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import SelectChatType from "./components/SelectType";
import ChatBox from "./components/ChatBox";
import ChatSidebar from "./components/ChatSidebar";
import RightPanel from "./components/Rightpanel";

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

  useEffect(() => {
    if (
      !currentChatType &&
      brandContext &&
      brandContext.brandName !== "Kavisha"
    ) {
      if (brandContext.isBrandAdmin) {
        selectChatType("recruiter");
      } else {
        selectChatType("job_seeker");
      }
    }
  }, [currentChatType, brandContext]);

  useEffect(() => {
    if (!session || !brandContext) return;
    const key = `lastChat:${session.user.id}:${brandContext.brandName}`;
    const saved = localStorage.getItem(key);
    if (saved && !currentChatId) setCurrentChatId(saved);
  }, [session, brandContext]);

  // useEffect(() => {
  //   if (!session || !brandContext || !currentChatId) return;
  //   const key = `lastChat:${session.user.id}:${brandContext.brandName}`;
  //   localStorage.setItem(key, currentChatId);
  // }, [session, brandContext, currentChatId]);

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
    const fetchMatches = async () => {
      if (!currentChatId) return;
      const res = await fetch(`/api/fetch-matches/${currentChatId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`matches ${res.status}`);
      const data = await res.json();
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
    };

    const fetchConnections = async () => {
      if (!currentChatId) return;
      const res = await fetch(`/api/connections/${currentChatId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`connections ${res.status}`);
      const data = await res.json();
      setConnections(Array.isArray(data?.connections) ? data.connections : []);
    };
    fetchData();
    fetchMatches();
    fetchConnections();
    if (currentChatId) {
      const key = `lastChat:${session.user.id}:${brandContext.brandName}`;
      localStorage.setItem(key, currentChatId);
    }
  }, [session, brandContext, currentChatId]);

  // useEffect(() => {
  //   if (allChats) {
  //     setCurrentChatType(allChats?.sessions[currentChatId]?.role);
  //     ;
  //   }
  // }, [allChats, currentChatId]);
  const toggleRightPanel = () => {
    setShow((prev) => !prev);
  };

  const openDetailsPanel = (type, dataObject = {}) => {
    setType(type);
    type === 3 && setViewdata(dataObject);
    toggleRightPanel();
  };

  const selectChatType = async (type) => {
    setCurrentChatType(type);
    if (!session || !brandContext) return;
    if (brandContext.brandName === "Kavisha") {
      try {
        setCreatingSession(true);
        const res = await fetch("/api/newchatsession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            role: type,
            brand: brandContext.subdomain,
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
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-h-screen">
      <div>
        <Header />
      </div>
      {/* Reserve space below header to avoid shifts */}
      {/* Show type selector for Kavisha users who haven't selected a type */}
      <div className="flex h-[70vh]">
        <ChatSidebar
          allChats={allChats}
          updateChatId={setCurrentChatId}
          currentChatId={currentChatId}
          currentChatType={currentChatType}
          setCurrentChatType={setCurrentChatType}
        />

        <div className="w-full">
          {!currentChatId &&
            brandContext &&
            brandContext.brandName === "Kavisha" && (
              <SelectChatType
                selectedType={currentChatType}
                selectChatType={selectChatType}
                isCreating={creatingSession}
              />
            )}

          {/* {!currentChatType &&
        brandContext &&
        brandContext.brandName !== "Kavisha" &&
        (brandContext.isBrandAdmin ? (
          <button
            onClick={() => {
              selectChatType("recruiter");
            }}
          >
            +Post A Job
          </button>
        ) : (
          <button
            onClick={() => {
              selectChatType("job_seeker");
            }}
          >
            {" "}
            + Job Search
          </button>
        ))} */}

          {/* Show chat once we have a chat ID */}
          {
            <ChatBox
              currentChatId={currentChatId}
              currentChatType={currentChatType}
              updateChatId={setCurrentChatId}
              openDetailsPanel={openDetailsPanel}
              toggleRightPanel={toggleRightPanel}
            />
          }
        </div>
      </div>
      {/* Only show input if we have a chat type selected */}
      {/* {currentChatType && (
        <>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            disabled={!currentChatType}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !currentChatType}
          >
            Send
          </button>
        </>
      )} */}

      {show && (
        <div className="fixed top-0 right-0 z-40 w-64 bg-orange-50 h-screen max-h-screen overflow-y-auto scroll-auto scrollbar-none">
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
