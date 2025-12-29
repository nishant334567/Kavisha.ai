"use client";
import { useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function DynamicMetaTags() {
  const brand = useBrandContext();

  useEffect(() => {
    if (!brand) return;

    const title = brand.brandName || brand.title || "Kavisha.ai";
    const description = "AI-Powered Communication Platform";
    const image = brand.logoUrl || brand.brandImageUrl;

    const updateMetaTag = (property, content) => {
      if (!content) return;

      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute("property", property);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:image", image);
  }, [brand]);

  return null;
}
