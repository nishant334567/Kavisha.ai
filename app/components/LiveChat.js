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
  const [chatInfo, setChatInfo] = useState({
    otherUser: "",
    // jobTitle: "",
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
    const checkConnection = async () => {
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
      className={`bg-white rounded-xl ${isEmbedded ? "w-full h-full" : "w-full h-full md:max-w-sm md:h-[500px]"} border border-[#004A4E]/20 shadow-lg flex flex-col overflow-hidden`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#004A4E]/5 border-b border-[#004A4E]/20 rounded-t-xl">
        <div>
          <div className="w-10 h-10 bg-[#004A4E] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {(displayName || "U").charAt(0).toUpperCase()}
          </div>
          <div className="uppercase font-baloo font-semibold text-lg py-2 text-[#004A4E]">
            {displayName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#004A4E]/10 transition-colors"
          aria-label="Close Chat"
        >
          <X className="w-4 h-4 text-[#004A4E]" />
        </button>
      </div>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-2 bg-[#004A4E]/[0.03]" ref={listRef}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="text-center py-2">
                  <span className="text-xs text-gray-500 bg-[#004A4E]/5 px-3 py-1 rounded-full">
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
                        <div className="w-8 h-8 rounded-full bg-[#004A4E] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {(senderName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium font-baloo text-[#004A4E]">
                            {senderName}
                          </p>
                          <p className="text-xs text-gray-600 font-baloo">
                            {text}
                          </p>
                        </div>
                      </div>
                      {i !== msgs.length - 1 && (
                        <div className="h-[0.5px] w-full bg-[#004A4E]/10"></div>
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
      <div className="w-full px-3 py-3 border-t border-[#004A4E]/20">
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="font-baloo w-full border border-[#004A4E]/20 rounded-xl px-3 py-2 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004A4E]/30 focus:border-[#004A4E] text-sm transition resize-none"
          placeholder="Write a message..."
        />
      </div>
      <div className="flex justify-end p-2 border-t border-[#004A4E]/20 rounded-b-xl">
        <button
          onClick={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          type="submit"
          disabled={!message.trim()}
          className="shadow-sm px-8 py-2 bg-[#004A4E] disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm hover:opacity-90"
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
