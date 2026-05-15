"use client";

import { useState, useEffect, useContext } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import BrandContext from "./BrandContext";
import Loader from "@/app/components/Loader";

export default function BrandContextProvider({ children }) {
  const { user } = useFirebaseSession();
  const [brandContext, setBrandContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const getSubdomain = () => {
      const hostname = window.location.hostname
        .toLowerCase()
        .replace(/^www\./, "");

      if (hostname === "localhost") {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("subdomain") || "kavisha";
      }

      const parts = hostname.split(".");
      const stagingIdx = parts.indexOf("staging");
      if (stagingIdx >= 0) return stagingIdx > 0 ? parts[0] : "kavisha";
      if (parts.length >= 3) return parts[0];
      if (parts.length === 2 && parts[0] === "kavisha") return "kavisha";
      return "kavisha";
    };

    const subdomain = getSubdomain();

    const loadBrandContext = async () => {
      try {
        const params = new URLSearchParams({ subdomain });
        if (user?.email) params.set("email", user.email);
        const res = await fetch(`/api/public/brand-context?${params}`);
        if (res.ok) {
          const context = await res.json();
          setBrandContext(context);
        }
      } catch {
        /* loader stays until retry/navigation */
      } finally {
        setLoading(false);
      }
    };
    loadBrandContext();
  }, [user?.email]);

  if (loading || !brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }
  return (
    <BrandContext.Provider value={brandContext}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrandContext = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error(
      "useBrandContext must be used within a BrandContextProvider",
    );
  }
  return context;
};
