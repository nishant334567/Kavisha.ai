"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import useSocket from "../context/useSocket";
import { X } from "lucide-react";

export default function Livechat({
  userA,
  userB,
  currentUserId,
  onClose,
  connectionId,
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

  const formatISTTime = (ts) => {
    const date = ts ? new Date(ts) : new Date();
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm mx-auto flex flex-col h-[500px] border border-slate-200 shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl">
          <div>
            <div className="font-semibold text-slate-800 text-base">
              {chatInfo.otherUser}
            </div>
            {/* <div className="text-xs text-slate-500">{chatInfo.jobTitle}</div> */}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Close Chat"
          >
            <X className="w-4 h-4 text-slate-600" />
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
                const isMe = m.senderUserId === user?.id;
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
