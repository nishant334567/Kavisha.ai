"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import useSocket from "../context/useSocket";
import { X } from "lucide-react";
import { formatDate } from "../utils/dateUtils";

export default function Livechat({
  userA,
  userB,
  currentUserId,
  onClose,
  connectionId,
  isEmbedded = false,
  otherUserDisplayName = null,
}) {
  const [message, setMessage] = useState("");
  const { user } = useFirebaseSession();
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({
    otherUser: "",
    connectionId: null,
  });

  const { socket, isOnline } = useSocket();

  // Masked name only when opened from community Connect/Message (parent passes otherUserDisplayName)
  const displayName =
    otherUserDisplayName != null && otherUserDisplayName !== ""
      ? otherUserDisplayName
      : chatInfo.otherUser || "";

  const groupedMessages = useMemo(() => {
    const grouped = {};
    messages.forEach((msg) => {
      // Use createdAt if available, fallback to current date
      const dateKey = msg.createdAt
        ? new Date(msg.createdAt).toDateString()
        : new Date().toDateString();

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });
    return grouped;
  }, [messages]);

  useEffect(() => {
    setConnectionLoading(true);
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/check-connection`, {
          method: "POST",
          body: JSON.stringify({
            userA,
            userB,
            connectionId: connectionId,
            currentUserId,
          }),
        });
        const data = await response.json();

        if (data.status && data.connectionId) {
          setChatInfo({
            otherUser: data.otherUser,
            connectionId: data.connectionId,
          });
        }
      } finally {
        setConnectionLoading(false);
      }
    };
    checkConnection();
  }, [userA, userB, connectionId, currentUserId]);

  useEffect(() => {
    if (!socket || !chatInfo.connectionId) return;

    const handleConnect = () => {
      socket.emit("join_room", { connectionId: chatInfo.connectionId });
    };

    const handleHistory = (history) => {
      setMessages(
        (history || []).map((m) => ({
          text: m.text ?? "",
          senderUserId: m.senderUserId,
          createdAt: m.createdAt,
        }))
      );
    };

    const handleMessage = (data) => {
      setMessages((prev) => {
        // Check if this message already exists to prevent duplicates
        const messageExists = prev.some(
          (msg) =>
            msg.text === (data?.text ?? "") &&
            msg.senderUserId ===
            (data?.senderUserId ?? data?.senderSessionId ?? "")
        );

        if (messageExists) {
          return prev; // Don't add duplicate
        }

        return [
          ...prev,
          {
            text: data?.text ?? "",
            senderUserId: data?.senderUserId ?? data?.senderSessionId ?? "",
            createdAt: data?.createdAt || new Date().toISOString(),
          },
        ];
      });
    };

    if (socket && chatInfo.connectionId) {
      if (socket.connected) {
        socket.emit("join_room", {
          connectionId: chatInfo.connectionId,
        });
      } else {
      }

      // socket.off("connect", handleConnect).on("connect", handleConnect);
      socket
        .off("message_history", handleHistory)
        .on("message_history", handleHistory);
      socket
        .off("message_received", handleMessage)
        .on("message_received", handleMessage);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("message_history", handleHistory);
        socket.off("message_received", handleMessage);
        // socket.disconnect();
      };
    }
  }, [socket, chatInfo.connectionId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    if (message.trim() && socket?.connected) {
      const payload = {
        text: message,
        connectionId: chatInfo.connectionId,
        senderUserId: user?.id,
        // timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", payload);
      // Don't add to local state here - let the socket handle it
      // This prevents duplicate messages
    }
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const content = (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg ${isEmbedded ? "h-full w-full" : "h-full w-full md:h-[500px] md:max-w-sm"}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-muted-bg px-4 py-3">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-highlight text-sm font-semibold text-white">
            {(displayName || "U").charAt(0).toUpperCase()}
          </div>
          <div className="py-2 text-lg font-semibold uppercase text-highlight font-baloo">
            {displayName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-card"
          aria-label="Close Chat"
        >
          <X className="h-4 w-4 text-highlight" />
        </button>
      </div>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-background p-2 scrollbar-none" ref={listRef}>
        {connectionLoading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted">
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="text-center py-2">
                  <span className="rounded-full bg-muted-bg px-3 py-1 text-xs text-muted">
                    {formatDate(date)}
                  </span>
                </div>
                {/* Messages for this date */}
                {msgs.map((m, i) => {
                  const isMe = m.senderUserId === user?.id;
                  const text = typeof m === "string" ? m : m.text;
                  const senderName = isMe
                    ? user?.name || "You"
                    : displayName;
                  return (
                    <div key={`${date}-${i}`}>
                      <div className="flex gap-2 px-4 py-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-white">
                          {(senderName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-baloo text-sm font-medium text-highlight">
                            {senderName}
                          </p>
                          <p className="font-baloo text-xs text-muted">
                            {text}
                          </p>
                        </div>
                      </div>
                      {i !== msgs.length - 1 && (
                        <div className="h-[0.5px] w-full bg-border/60"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Message Input */}
      <div className="w-full border-t border-border px-3 py-3 bg-card">
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={connectionLoading}
          className="font-baloo w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground transition placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder={connectionLoading ? "Loading..." : "Write a message..."}
        />
      </div>
      <div className="flex justify-end border-t border-border bg-card p-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          type="submit"
          disabled={connectionLoading || !message.trim()}
          className="rounded-lg bg-highlight px-8 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted"
        >
          Send
        </button>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center md:p-4">
      {content}
    </div>
  );
}
