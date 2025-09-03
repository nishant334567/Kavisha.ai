"use client";
import { SocketContext } from "./SocketContext";
import { io } from "socket.io-client";
import { useRef, useEffect, useState } from "react";

export default function SocketProvider({ children, userId }) {
  const socketRef = useRef(null);
  const [isOnline, setIsOnline] = useState(false);
  const [socketUrl, setSocketUrl] = useState(null);

  // Set socket URL only on client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.protocol}//${window.location.host}`;
      setSocketUrl(url);
    }
  }, []);

  useEffect(() => {
    // Don't connect if no userId or no socketUrl yet
    if (!userId || !socketUrl) {
      setIsOnline(false);
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(socketUrl, {
        withCredentials: false,
        forceNew: true,
        transports: ["websocket", "polling"],
        timeout: 20000,
        reconnectionAttempts: 5,
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
  }, [userId, socketUrl]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isOnline }}>
      {children}
    </SocketContext.Provider>
  );
}
