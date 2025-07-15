"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export default function Notification({ updateChatId, notifications, toggle }) {
  const [notis, setNotis] = useState(notifications || []);
  const [refreshing, setRefreshing] = useState(false);
  const { data: session } = useSession();
  const fetchNotis = async () => {
    setRefreshing(true);
    const res = await fetch(`/api/notifications/${session?.user?.id}`);
    const freshNotis = await res.json();
    setNotis(freshNotis.messages);
    setRefreshing(false);
  };

  return (
    <div className="w-70 min-h-30 overflow-y-auto scrollbar-none bg-white rounded-lg shadow-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <div className="flex justify-between gap-2">
          <span
            onClick={fetchNotis}
            className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-md font-medium cursor-pointer"
          >
            {refreshing ? "Refreshing..." : "Refresh 🔃"}
          </span>
          <span
            onClick={() => toggle()}
            className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-md font-semibold cursor-pointer"
          >
            X
          </span>
        </div>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {notis.length === 0 && (
          <div className="text-gray-400 text-center py-8">No notifications</div>
        )}
        {notis.length > 0 &&
          notis.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-md shadow-sm border border-gray-100 bg-gray-50 transition-colors ${!item.isRead ? "bg-gray-50 border-gray-200" : ""}`}
            >
              <div className="text-xs text-gray-400 mb-1">
                {formatDate(item.createdAt)}
              </div>
              <div className="text-gray-800 text-xs">{item.message}</div>
              <button
                className="mt-2 border-1 text-black bg-gray-50 text-xs hover:text-gray-100 hover:bg-gray-500  px-1 py-0.5 rounded-sm "
                onClick={() => {
                  updateChatId(item.relatedSession);
                }}
              >
                Open Match
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
