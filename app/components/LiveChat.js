"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

export default function Livechat({ chatData, onClose }) {
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  const connectionId = useMemo(() => {
    return [chatData.senderSession, chatData.receiverSession].sort().join("_");
  }, [chatData.senderSession, chatData.receiverSession]);

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
    if (!socketRef.current) {
      socketRef.current = io(`http://localhost:3000`);
    }
    const socket = socketRef.current;

    const handleConnect = () => {
      socket.emit("authenticate", {
        userId: session?.user?.id,
        sessionId: chatData.senderSession,
      });
      socket.emit("join_room", { connectionId });
    };

    const handleHistory = (history) => {
      setMessages(
        (history || []).map((m) => ({
          text: m.text ?? "",
          senderSessionId: m.senderSessionId,
          receiverSessionId: m.receiverSessionId,
          timestamp: m.timestamp,
        }))
      );
    };

    const handleMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          text: data?.text ?? "",
          senderSessionId: data?.senderSessionId,
          receiverSessionId: data?.receiverSessionId,
          timestamp: data?.timestamp ?? new Date().toISOString(),
        },
      ]);
    };

    // Ensure single listeners per mount/update
    socket.off("connect", handleConnect).on("connect", handleConnect);
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
      socket.disconnect();
      socketRef.current = null;
    };
  }, [connectionId, chatData.senderSession, session?.user?.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = (senderSessionId, receiverSessionId) => {
    if (message.trim() && socketRef.current?.connected) {
      const payload = {
        text: message,
        connectionId: connectionId,
        senderSessionId: senderSessionId,
        receiverSessionId: receiverSessionId,
        timestamp: new Date().toISOString(),
      };
      socketRef.current.emit("send_message", payload);

      setMessages((prev) => [
        ...prev,
        {
          text: message,
          senderSessionId: senderSessionId,
          receiverSessionId: receiverSessionId,
          timestamp: payload.timestamp,
        },
      ]);
    }
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatData.senderSession, chatData.receiverSession);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 h-[500px] md:h-[600px] lg:h-[500px] xl:h-[450px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Live Chat</h2>
              <p className="text-xs text-slate-600">Real-time messaging</p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
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

        {/* Session Info */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">From:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                {chatData.senderSession}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">To:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border text-xs">
                {chatData.receiverSession}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <div ref={listRef} className="h-full overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">No messages yet</p>
                <p className="text-slate-400 text-xs">
                  Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((m, i) => {
                const isMe = m.senderSessionId === chatData.senderSession;
                const text = typeof m === "string" ? m : m.text;
                const time = formatISTTime(m.timestamp);

                return (
                  <div
                    key={i}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] ${isMe ? "order-2" : "order-1"}`}
                    >
                      <div
                        className={`rounded-2xl px-3 py-2 shadow-sm ${
                          isMe
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {text}
                        </div>
                      </div>
                      <div
                        className={`mt-1 text-xs opacity-70 text-center ${isMe ? "text-right" : "text-left"}`}
                      >
                        {time} IST
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                placeholder="Type your message here..."
              />
            </div>
            <button
              onClick={() =>
                sendMessage(chatData.senderSession, chatData.receiverSession)
              }
              disabled={!message.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
