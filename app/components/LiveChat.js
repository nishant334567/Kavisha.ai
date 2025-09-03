"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSocket from "../context/useSocket";

export default function Livechat({
  sessionA,
  sessionB,
  userA,
  userB,
  currentUserId,
  onClose,
  currentSessionId,
  connectionId,
}) {
  const [message, setMessage] = useState("");
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const [chatInfo, setChatInfo] = useState({
    otherUser: "",
    jobTitle: "",
    connectionId: null,
  });

  const { socket, isOnline } = useSocket();

  const formatISTTime = (ts) => {
    const date = ts ? new Date(ts) : new Date();
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {}, [sessionA, sessionB, userA, userB, connectionId]);
  useEffect(() => {
    const checkConnection = async () => {
      const cid = [sessionA, sessionB].sort().join("_");
      const response = await fetch(`/api/check-connection`, {
        method: "POST",
        body: JSON.stringify({
          sessionA,
          sessionB,
          userA,
          userB,
          connectionId: connectionId,
          currentUserId,
          // currentSessionId,
        }),
      });
      const data = await response.json();

      if (data.status && data.connectionId) {
        setChatInfo({
          otherUser: data.otherUser,
          jobTitle: data.jobTitle,
          connectionId: data.connectionId,
        });
      }
    };
    checkConnection();
  }, [sessionA, sessionB, userA, userB, connectionId]);

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
        }))
      );
    };

    const handleMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: data?.text ?? "",
          senderUserId: data?.senderUserId ?? data?.senderSessionId ?? "",
        },
      ]);
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
        senderUserId: session?.user?.id,
        // timestamp: new Date().toISOString(),
      };
      socket.emit("send_message", payload);

      setMessages((prev) => [
        ...prev,
        {
          text: message,
          senderUserId: session?.user?.id,
          // timestamp: payload.timestamp,
        },
      ]);
    }
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm mx-auto flex flex-col h-[500px] border border-slate-200 shadow-lg">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl">
          <div>
            <div className="font-semibold text-slate-800 text-base">
              {chatInfo.otherUser}
            </div>
            <div className="text-xs text-slate-500">{chatInfo.jobTitle}</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Close Chat"
          >
            <svg
              className="w-4 h-4 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2" ref={listRef}>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((m, i) => {
                const isMe = m.senderUserId === session?.user?.id;
                const text = typeof m === "string" ? m : m.text;
                return (
                  <div
                    key={i}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm max-w-[75%] shadow-sm ${
                        isMe
                          ? "bg-sky-700 text-white"
                          : "bg-gray-50 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Message Input */}
        <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 text-sm transition"
              placeholder="Type your message here..."
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-sm"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
