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
    <div className="w-70 min-h-30 overflow-y-auto scrollbar-none bg-white rounded-lg shadow-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
        <div className="flex justify-between gap-2">
          <span
            onClick={fetchNotis}
            className="text-xs bg-white text-slate-700 px-2 py-1 rounded-md font-medium cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200"
          >
            {refreshing ? "Refreshing..." : "Refresh 🔃"}
          </span>
          <span
            onClick={() => toggle()}
            className="text-xs bg-white text-slate-700 px-2 py-1 rounded-md font-semibold cursor-pointer hover:bg-slate-50 transition-colors border border-slate-200"
          >
            X
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {notis.length === 0 && (
          <div className="text-slate-500 text-center py-8">
            No notifications
          </div>
        )}
        {notis.length > 0 &&
          notis.map((item, index) => (
            <div
              key={index}
              className={`p-3 rounded-md shadow-sm border border-slate-200 bg-slate-50 transition-colors ${!item.isRead ? "bg-slate-100 border-slate-300" : ""}`}
            >
              <div className="text-xs text-slate-500 mb-1">
                {formatDate(item.createdAt)}
              </div>
              <div className="text-slate-800 text-xs">{item.message}</div>
              <button
                className="mt-2 border border-slate-300 text-slate-700 bg-white text-xs hover:text-white hover:bg-slate-600 transition-colors px-2 py-1 rounded-sm"
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
