"use client";
import { SocketContext } from "./SocketContext";
import { io } from "socket.io-client";
import { useRef, useEffect, useState } from "react";

export default function SocketProvider({ children, userId }) {
  const socketRef = useRef(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }
    if (!socketRef.current) {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

      socketRef.current = io(socketUrl, {
        withCredentials: true,
        forceNew: true,
      });

      socketRef.current.on("connect", () => {
        if (userId) {
          socketRef.current.emit("register_user", userId);
          setIsOnline(true);
        }
      });

      socketRef.current.on("connect_error", () => {
        setIsOnline(false);
      });

      socketRef.current.on("disconnect", () => {
        setIsOnline(false);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsOnline(false);
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isOnline }}>
      {children}
    </SocketContext.Provider>
  );
}
