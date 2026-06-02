"use client";

import { useState, useEffect, useContext } from "react";
import { usePathname } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import BrandContext from "./BrandContext";
import Loader from "@/app/components/Loader";
import { getSubdomain } from "@/app/utils/subdomain";

export default function BrandContextProvider({ children }) {
  const { user } = useFirebaseSession();
  const pathname = usePathname();
  const [brandContext, setBrandContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const subdomain = getSubdomain() || "kavisha";

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
  }, [user?.email, pathname]);

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
