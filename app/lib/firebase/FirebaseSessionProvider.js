"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const FirebaseSessionContext = createContext({
  user: null,
  loading: true,
  refresh: () => {},
});

export function FirebaseSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const isRefreshingRef = useRef(false);

  const refresh = async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Refresh session when navigating to root page (e.g., after login)
  // Only refresh when pathname actually changes TO "/", not on every render
  useEffect(() => {
    if (pathname === "/" && prevPathnameRef.current !== "/") {
      refresh();
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <FirebaseSessionContext.Provider value={{ user, loading, refresh }}>
      {children}
    </FirebaseSessionContext.Provider>
  );
}

export function useFirebaseSession() {
  const context = useContext(FirebaseSessionContext);
  if (context === undefined) {
    throw new Error(
      "useFirebaseSession must be used within a FirebaseSessionProvider"
    );
  }
  return context;
}
