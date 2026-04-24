"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { widgetAwareFetch } from "@/app/lib/widget-session";

export function useFirebaseSession() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await widgetAwareFetch("/api/user");

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
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { user, loading, refresh };
}
