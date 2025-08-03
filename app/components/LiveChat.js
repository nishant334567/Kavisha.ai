"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";

export default function Livechat({ chatData }) {
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const { data: session } = useSession();

  const connectionId = useMemo(() => {
    return [chatData.senderSession, chatData.receiverSession].sort().join("_");
  }, [chatData.senderSession, chatData.receiverSession]);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(`http://localhost:3000`);
      socketRef.current.on("connect", () => {
        console.log("Connected ✅");
        socketRef.current.emit("authenticate", {
          userId: session?.user?.id,
          sessionId: chatData.senderSession,
        });
        socketRef.current.emit("join_room", { connectionId });
        socketRef.current.on("message_received", (data) => {
          console.log("Message received:", data);
        });
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectionId]);

  const sendMessage = () => {
    if (message.trim() && socketRef.current?.connected) {
      socketRef.current.emit("send_message", {
        text: message,
        connectionId: connectionId,
        senderId: session?.user?.id,
        timestamp: new Date(),
      });
      console.log("Message sent !! 📤");
    }
    setMessage("");
  };
  return (
    <>
      <div className="p-2 bg-gray-300 shadow-md w-[300px] h-[200px]">
        <p>Live Chat:</p>
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
        <button onClick={() => sendMessage()}>Send</button>
      </div>
    </>
  );
}
