"use client";

import { Users, MessageCircle, MessageSquare } from "lucide-react";

const CARD_GRADIENT = "linear-gradient(to right, #DBF8F8 0%, #DBF3F8 50%, #DBEEF8 100%)";

export default function ServiceCard({
  service,
  isLoading,
  onStart,
}) {
  if (!service) return null;

  const { title, name, chatCount = 0, userCount = 0, messageCount = 0 } = service;
  const serviceKey = service._key ?? service.name ?? "";
  const displayTitle = title || name || "Chat";

  return (
    <div className="font-baloo tracking-[0.08em] flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="px-4 py-3 rounded-t-xl"
        style={{ background: CARD_GRADIENT }}
      >
        <h2 className="font-normal text-gray-900 text-lg text-left">
          {displayTitle}
        </h2>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 items-center justify-items-start">
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 text-left">
          <Users className="h-4 w-4 shrink-0 text-gray-500" />
          {userCount} users
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 text-left">
          <MessageCircle className="h-4 w-4 shrink-0 text-gray-500" />
          {messageCount} messages
          
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 text-left">
          <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" />
          {chatCount} chats
        </span>
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={() => onStart(service, serviceKey)}
            disabled={isLoading}
            className="py-2 px-4 rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity text-gray-900"
            style={{ background: CARD_GRADIENT }}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                Starting…
              </span>
            ) : (
              "Start chatting"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
