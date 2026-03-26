"use client";

import { Users, MessageCircle, MessageSquare } from "lucide-react";

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
    <div className="font-baloo tracking-[0.08em] flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <div className="px-4 py-3 rounded-t-xl bg-[linear-gradient(to_right,#DBF8F8_0%,#DBF3F8_50%,#DBEEF8_100%)] dark:bg-none dark:bg-muted-bg">
        <h2 className="font-normal text-foreground text-lg text-left">
          {displayTitle}
        </h2>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 items-center justify-items-start">
        <span className="inline-flex items-center gap-2 text-sm text-muted text-left">
          <Users className="h-4 w-4 shrink-0 text-muted" />
          {userCount} users
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-muted text-left">
          <MessageCircle className="h-4 w-4 shrink-0 text-muted" />
          {messageCount} messages
          
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-muted text-left">
          <MessageSquare className="h-4 w-4 shrink-0 text-muted" />
          {chatCount} chats
        </span>
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={() => onStart(service, serviceKey)}
            disabled={isLoading}
            className="py-2 px-4 rounded-full font-medium text-sm transition-colors disabled:opacity-60 border-0 text-[#2D545E] bg-[linear-gradient(to_right,#DBF8F8_0%,#DBF3F8_50%,#DBEEF8_100%)] hover:opacity-90 dark:bg-none dark:bg-transparent dark:text-[#5eead4] dark:border dark:border-[#5eead4]/40 dark:hover:bg-muted-bg"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
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
