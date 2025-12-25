"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";

export default function ChatRequests() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const brandContext = useBrandContext();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);

  useEffect(() => {
    const fetchChatRequests = async () => {
      try {
        const response = await fetch(
          `/api/admin/fetch-sessions?brand=${brandContext?.subdomain}&type=normal`
        );
        const data = await response.json();
        if (data.success) {
          setAllSessions(data.users);
          setSessionData(data.users);
        } else {
          setSessionData([]);
          setAllSessions([]);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setSessionData([]);
        setAllSessions([]);
      }
    };

    if (brandContext?.subdomain) {
      fetchChatRequests();
    }
  }, [brandContext?.subdomain]);

  const getSessionCount = (serviceName) => {
    if (!serviceName)
      return allSessions.reduce((sum, user) => sum + user.sessions.length, 0);
    return allSessions.reduce(
      (sum, user) =>
        sum + user.sessions.filter((s) => s.role === serviceName).length,
      0
    );
  };

  const filterSessions = (serviceName) => {
    setSelectedService(serviceName);
    if (!serviceName) {
      setSessionData(allSessions);
      return;
    }
    const filtered = allSessions
      .map((user) => ({
        ...user,
        sessions: user.sessions.filter((s) => s.role === serviceName),
      }))
      .filter((user) => user.sessions.length > 0);
    setSessionData(filtered);
  };

  return (
    <div>
      <div className="px-4 mt-4 gap-2">
        <button
          onClick={() => router.back()}
          className="text-black hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <h1 className=" text-3xl md:text-4xl font-zen text-[#000A67] mb-6 pb-2 inline-block">
            All Chat Requests
          </h1>
        </div>
      </div>
      <div className="w-full sm:w-[85%] mx-auto">
        {/* <div className="flex items-center justify-between mb-8"> */}
        {/* <div className="flex-1"></div> */}
        <div className="grid grid-cols-2 md:flex items-center justify-center gap-4">
          {brandContext?.services?.map((item, index) => {
            const count = getSessionCount(item?.name);
            const isLast = index === brandContext.services.length - 1;
            return (
              <div key={index} className="flex items-center gap-4">
                <button
                  onClick={() => filterSessions(item?.name)}
                  className={`font-akshar uppercase text-lg md:text-xl tracking-wide transition-colors relative ${
                    selectedService === item?.name
                      ? "text-blue-600"
                      : "text-black"
                  }`}
                >
                  {item?.title}
                  {count > 0 && (
                    <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {count}
                    </span>
                  )}
                </button>
                {!isLast && (
                  <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300"></div>
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
            //   loadingLogs={loadingLogs}
          />
        )}
      </div>
    </div>
  );
}
