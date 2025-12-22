"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ChevronRight } from "lucide-react";
import UserCard from "@/app/admin/components/UserCard";
import AdminLogsModal from "@/app/admin/components/AdminLogsModal";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MyCommunity() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const brandContext = useBrandContext();
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState(null);

  useEffect(() => {
    const fetchChatRequests = async () => {
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
      }
    };

    if (brandContext?.subdomain) {
      fetchChatRequests();
    }
  }, [brandContext?.subdomain]);
  return (
    <div className="mt-4 px-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      <h1 className="text-2xl font-semibold text-blue-900 mb-6 border-b-2 border-blue-300 pb-2 inline-block">
        My Community
      </h1>
      <div>
        {usersData.length > 0 ? (
          usersData.map((item, index) => {
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
    </div>
  );
}
