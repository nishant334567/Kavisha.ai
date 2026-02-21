"use client";

import { useState, useEffect, useContext } from "react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import BrandContext from "./BrandContext";
import { client, urlFor } from "@/app/lib/sanity";
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
                  paymentQr,
                  acceptPayment,
                  title,
                  subtitle,
                  admins,
                  initialmessage,
                  enableCommunityOnboarding,
                  enableProfessionalConnect,
                  enableFriendConnect,
                  communityName,
                  enableQuiz,
                  quizName,
                  services
              }[0]`
        );
        if (brand) {
          // Generate URLs using urlFor helper with proper null checks
          const logoUrl = brand.logo?.asset?._ref
            ? urlFor(brand.logo).url()
            : null;
          const brandImageUrl = brand.brandImage?.asset?._ref
            ? urlFor(brand.brandImage).url()
            : null;
          const paymentQrUrl = brand.paymentQr?.asset?._ref
            ? urlFor(brand.paymentQr).url()
            : null;

          const isAdmin = brand.admins?.includes(user?.email) || false;
          const context = {
            brandId: brand._id,
            brandName: brand.brandName,
            loginButtonText: brand.loginButtonText,
            logoUrl: logoUrl,
            brandImageUrl: brandImageUrl,
            paymentQrUrl: paymentQrUrl,
            acceptPayment: brand.acceptPayment || false,
            title: brand.title,
            subtitle: brand.subtitle,
            admins: brand.admins || [],
            isBrandAdmin: isAdmin,
            subdomain,
            initialmessage: brand.initialmessage,
            enableCommunityOnboarding: true,
            enableProfessionalConnect: brand.enableProfessionalConnect || false,
            enableFriendConnect: brand.enableFriendConnect || false,
            communityName: brand.communityName || "Community",
            enableQuiz: brand.enableQuiz || false,
            quizName: brand.quizName || "Take quiz/survey",
            services: brand.services,
          };

          setBrandContext(context);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    brandDataFromSanity();
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
      "useBrandContext must be used within a BrandContextProvider"
    );
  }
  return context;
};
