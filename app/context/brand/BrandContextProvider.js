"use client";

import { useState, useEffect, useContext } from "react";
import { useSession } from "next-auth/react";
import BrandContext from "./BrandContext";
import { client, urlFor } from "@/app/lib/sanity";
import Loader from "@/app/components/Loader";

export default function BrandContextProvider({ children }) {
  const { data: session } = useSession();
  const [brandContext, setBrandContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const getSubdomain = () => {
      const hostname = window.location.hostname
        .toLowerCase()
        .replace(/^www\./, "");

      // Prefer query param only on localhost for dev
      if (hostname === "localhost") {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("subdomain") || "kavisha";
      }

      const parts = hostname.split(".");

      if (parts.length >= 3) return parts[0];

      if (parts.length === 2 && parts[0] === "kavisha") return "kavisha";
      return "kavisha";
    };

    const subdomain = getSubdomain();

    const brandDataFromSanity = async () => {
      try {
        const brand = await client.fetch(
          `*[_type == "brand" && subdomain == "${subdomain}"]
              {
                  _id,
                  brandName,
                  loginButtonText,
                  subdomain,
                  logo,
                  brandImage,
                  title,
                  subtitle,
                  admins,
                  initialmessage,
                  services
              }[0]`
        );
        if (brand) {
          console.log("Brand data from Sanity:", brand);

          // Generate URLs using urlFor helper with proper null checks
          const logoUrl = brand.logo?.asset?._ref
            ? urlFor(brand.logo).url()
            : null;
          const brandImageUrl = brand.brandImage?.asset?._ref
            ? urlFor(brand.brandImage).url()
            : null;

          console.log("Generated Logo URL:", logoUrl);
          console.log("Generated Brand Image URL:", brandImageUrl);

          const isAdmin = brand.admins?.includes(session?.user?.email) || false;
          const context = {
            brandId: brand._id,
            brandName: brand.brandName,
            loginButtonText: brand.loginButtonText,
            logoUrl: logoUrl,
            brandImageUrl: brandImageUrl,
            title: brand.title,
            subtitle: brand.subtitle,
            admins: brand.admins || [],
            isBrandAdmin: isAdmin,
            subdomain,
            initialmessage: brand.initialmessage,
            services: brand.services,
          };
          console.log("Final context:", context);
          setBrandContext(context);
        }
      } catch (err) {
        console.error("Failed to fetch brand context:", err);
      } finally {
        setLoading(false);
      }
    };
    brandDataFromSanity();
  }, [session?.user?.email]);

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
      "useBrandContext must be used within a BrandContextProvider"
    );
  }
  return context;
};
