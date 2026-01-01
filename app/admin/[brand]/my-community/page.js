"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ChevronRight } from "lucide-react";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import Livechat from "@/app/components/LiveChat";
import Loader from "@/app/components/Loader";

export default function MyCommunity() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const [allUsers, setAllUsers] = useState([]);
  const [usersData, setUsersData] = useState([]);
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
          `/api/admin/fetch-sessions?brand=${brandContext?.subdomain}&type=community`
        );
        const data = await response.json();
        if (data.success) {
          setAllUsers(data.users);
          setUsersData(data.users);
        } else {
          setAllUsers([]);
          setUsersData([]);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        setAllUsers([]);
        setUsersData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRequests();
  }, [brandContext?.subdomain]);
  const getTabCount = (tab) => {
    // These tabs are display-only (not filterable)
    if (tab === "MEMBERS") return allUsers.length;
    if (tab === "MATCHES") return 0; // TODO: Implement actual matches count
    if (tab === "CONNECTIONS") return 0; // TODO: Implement actual connections count
    return 0;
  };

  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);
  };

  if (loading) {
    return <Loader loadingMessage="Loading community..." />;
  }

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
          <h1 className="md:pl-32 text-3xl md:text-4xl font-zen text-[#000A67] mb-6 pb-2 inline-block">
            Community
          </h1>
        </div>
      </div>
      <div className="w-full sm:w-[85%] mx-auto md:px-6">
        {/* Navigation Tabs - Display only (not clickable/filterable) */}
        <div className="flex items-center justify-center gap-4 mb-8 px-6">
          {["MEMBERS", "MATCHES", "CONNECTIONS"].map((tab, index) => {
            const isLast = index === 2;
            const count = getTabCount(tab);
            return (
              <div key={tab} className="flex items-center">
                <div className="uppercase font-medium tracking-wide text-gray-900 relative font-akshar text-xl">
                  {tab}
                  {count > 0 && (
                    <span className="absolute -top-2 -right-6 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {count}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div className="hidden lg:block lg:w-px lg:h-6 lg:bg-gray-300 mx-8"></div>
                )}
              </div>
            );
          })}
        </div>
        <div>
          {usersData.length > 0 ? (
            usersData.map((item, index) => {
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
      </div>

      {showLogsModal && selectedSessionLogs && (
        <AdminLogsModal
          selectedSessionLogs={selectedSessionLogs}
          setShowLogsModal={setShowLogsModal}
          setSelectedSessionLogs={setSelectedSessionLogs}
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
  );
}
