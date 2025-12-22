"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ChevronRight } from "lucide-react";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";

export default function ChatRequests() {
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
    <div className="mt-4 px-6">
      <h1 className="text-2xl font-semibold text-blue-900 mb-6 border-b-2 border-blue-300 pb-2 inline-block">
        All Chat Requests
      </h1>

      <div className="flex items-center gap-4 mb-8">
        {brandContext?.services?.map((item, index) => {
          const count = getSessionCount(item?.name);
          const isLast = index === brandContext.services.length - 1;
          return (
            <div key={index} className="flex items-center gap-4">
              <button
                onClick={() => filterSessions(item?.name)}
                className={`uppercase text-sm font-medium tracking-wide hover:text-blue-600 transition-colors relative ${
                  selectedService === item?.name
                    ? "text-blue-600"
                    : "text-gray-900"
                }`}
              >
                {item?.title}
                {count > 0 && (
                  <span className="absolute -top-2 -right-5 text-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
              {!isLast && <div className="w-px h-6 bg-gray-300"></div>}
            </div>
          );
        })}
        <button className="ml-auto w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

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
  );
}
