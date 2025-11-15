"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useFirebaseSession() {
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

  return { user, loading, refresh };
}
