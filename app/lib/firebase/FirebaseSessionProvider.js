"use client";

import { createContext, useContext, useState, useEffect } from "react";
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

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user", {
        credentials: "include",
      });

      if (!res.ok) {
        // If user API fails (401 or 404), redirect to login
        // Only redirect if not already on login page to avoid loops
        if (pathname !== "/login") {
          router.push("/login");
        }
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data?.user || null);
    } catch {
      setUser(null);
      // On error, redirect to login if not already there
      if (pathname !== "/login") {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

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
