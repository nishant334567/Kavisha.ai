"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Livechat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";

export default function ChatRequests() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const [sessionData, setSessionData] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedService, setSelectedService] = useState("all"); // "all" | service _key
  const brandContext = useBrandContext();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatRequests = async () => {
      if (!brandContext?.subdomain) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/fetch-sessions?brand=${brandContext?.subdomain}&type=normal`
        );
        const data = await response.json();
        if (data.success) {
          setAllSessions(data.users);
          setSelectedService("all");
          setSessionData(data.users);
        } else {
          setSessionData([]);
          setAllSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setSessionData([]);
        setAllSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRequests();
  }, [brandContext?.subdomain]);

  // Filter by service _key (session.serviceKey). "All" = no filter = all sessions (including serviceKey null / remaining).
  const getSessionCount = (service) => {
    if (!service)
      return allSessions.reduce((sum, user) => sum + user.sessions.length, 0);
    const key = service._key ?? service;
    return allSessions.reduce(
      (sum, user) =>
        sum + user.sessions.filter((s) => s.serviceKey === key).length,
      0
    );
  };

  const getPeopleCount = (service) => {
    if (!service) return allSessions.length;
    const key = service._key ?? service;
    return allSessions.filter((u) =>
      u.sessions.some((s) => s.serviceKey === key)
    ).length;
  };

  const getQuestionCount = (service) => {
    const sumMessages = (users) =>
      users.reduce(
        (sum, u) =>
          sum + u.sessions.reduce((s, sess) => s + (sess.messageCount || 0), 0),
        0
      );
    if (!service) return sumMessages(allSessions);
    const key = service._key ?? service;
    const filtered = allSessions.map((u) => ({
      ...u,
      sessions: u.sessions.filter((s) => s.serviceKey === key),
    })).filter((u) => u.sessions.length > 0);
    return sumMessages(filtered);
  };

  const filterSessions = (service) => {
    if (!service || service === "all") {
      setSelectedService("all");
      setSessionData(allSessions); // All = every session (remaining + keyed)
      return;
    }
    const key = service._key ?? service;
    setSelectedService(key);
    const filtered = allSessions
      .map((user) => ({
        ...user,
        sessions: user.sessions.filter((s) => s.serviceKey === key),
      }))
      .filter((user) => user.sessions.length > 0);
    setSessionData(filtered);
  };

  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };

  if (loading) {
    return <Loader loadingMessage="Loading chat requests..." />;
  }

  return (
    <div className="overflow-visible">
      <div className="px-4 mt-4 gap-2 overflow-visible">
        <button
          onClick={() => router.back()}
          className="text-black hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start overflow-visible">
          <h1 className="md:pl-32 text-3xl md:text-4xl font-zen text-[#000A67] mb-6 pb-2 inline-block">
            All Chat Requests
          </h1>
        </div>
      </div>
      <div className="w-full sm:w-[85%] mx-auto md:px-6">
        {/* <div className="flex items-center justify-between mb-8"> */}
        {/* <div className="flex-1"></div> */}
        <div className="grid grid-cols-2 md:flex items-center justify-center gap-y-4 md:gap-y-0 px-6 my-4 overflow-visible">
          <div className="flex items-center relative group">
            <button
              onClick={() => filterSessions("all")}
              className={`font-akshar uppercase text-lg md:text-xl tracking-wide transition-colors relative ${selectedService === "all" ? "text-blue-600" : "text-black"
                }`}
            >
              All
              {getSessionCount(null) > 0 && (
                <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {getSessionCount(null)}
                </span>
              )}
            </button>
            <div className="absolute left-0 top-full mt-1 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-100 z-[9999]">
              <div className="p-3 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px]">
                <p className="font-akshar font-semibold text-[#000A67] mb-2 text-sm">All analytics</p>
                <p className="text-xs text-gray-600">Total number of people: {getPeopleCount(null)}</p>
                <p className="text-xs text-gray-600">Total number of chats: {getSessionCount(null)}</p>
                <p className="text-xs text-gray-600">Total number of questions: {getQuestionCount(null)}</p>
              </div>
            </div>
            {brandContext?.services?.length > 0 && (
              <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300 mx-8"></div>
            )}
          </div>
          {brandContext?.services?.map((item, index) => {
            const count = getSessionCount(item);
            const isLast = index === brandContext.services.length - 1;
            const isSelected = selectedService === (item?._key ?? item?.name);
            return (
              <div key={item?._key ?? index} className="flex items-center relative group">
                <button
                  onClick={() => filterSessions(item)}
                  className={`font-akshar uppercase text-lg md:text-xl tracking-wide transition-colors relative ${isSelected ? "text-blue-600" : "text-black"
                    }`}
                >
                  {item?.title}
                  {count > 0 && (
                    <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {count}
                    </span>
                  )}
                </button>
                <div className="absolute left-0 top-full mt-1 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-100 z-[9999]">
                  <div className="p-3 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px]">
                    <p className="font-akshar font-semibold text-[#000A67] mb-2 text-sm truncate">{item?.title || item?.name} analytics</p>
                    <p className="text-xs text-gray-600">Total number of people: {getPeopleCount(item)}</p>
                    <p className="text-xs text-gray-600">Total number of chats: {getSessionCount(item)}</p>
                    <p className="text-xs text-gray-600">Total number of questions: {getQuestionCount(item)}</p>
                  </div>
                </div>
                {!isLast && (
                  <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300 mx-8"></div>
                )}
              </div>
            );
          })}
        </div>
        {/* </div> */}

        <div>
          {sessionData.length > 0 ? (
            sessionData.map((item, index) => {
              return (
                <UserCard
                  key={index}
                  user={item}
                  setSelectedSessionLogs={setSelectedSessionLogs}
                  setShowLogsModal={setShowLogsModal}
                  openChatSession={openChatSession}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center text-gray-500 py-8">
              No sessions found
            </div>
          )}
        </div>

        {showLogsModal && selectedSessionLogs && (
          <AdminLogsModal
            selectedSessionLogs={selectedSessionLogs}
            setShowLogsModal={setShowLogsModal}
            setSelectedSessionLogs={setSelectedSessionLogs}
            brand={brandContext?.subdomain}
          />
        )}

        {openChat && userA && userB && (
          <Livechat
            userA={userA}
            userB={userB}
            currentUserId={user?.id}
            onClose={() => setOpenChat(false)}
            connectionId={connectionId}
          />
        )}
      </div>
    </div>
  );
}
