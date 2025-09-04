"use client";

import { useState, useEffect, useContext } from "react";
import { useSession } from "next-auth/react";
import BrandContext from "./BrandContext";
import { client } from "@/app/lib/sanity";

export default function BrandContextProvider({ children }) {
  const { data: session } = useSession();
  const [brandContext, setBrandContext] = useState(null);

  useEffect(() => {
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
                  subdomain,
                  logo,
                  brandImage,
                  title,
                  subtitle,
                  description,
                  brandData,
                  admins,
                  header,
              }[0]`
        );
        if (brand) {
          const context = {
            brandId: brand._id,
            brandName: brand.brandName,
            header: brand.header,
            logo: brand.logo,
            brandImage: brand.brandImage,
            title: brand.title,
            subtitle: brand.subtitle,
            description: brand.description,
            brandData: brand.brandData,
            isBrandAdmin: brand.admins?.includes(session?.user?.email) || false,
            subdomain,
          };
          setBrandContext(context);
        }
      } catch (err) {
        console.error("Failed to fetch brand context:", err);
      }
    };
    brandDataFromSanity();
  }, [session]);
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
