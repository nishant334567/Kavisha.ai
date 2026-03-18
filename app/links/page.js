"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Share2, Check, MoreVertical } from "lucide-react";

function domainLabel(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const part = host.split(".").slice(-2, -1)[0] || host;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  } catch {
    return "";
  }
}

export default function LinksPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [linkTree, setLinkTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isCurrentBrand = brand && brandContext?.subdomain === brand;
  const headerName = isCurrentBrand
    ? (brandContext?.brandName ?? "")
    : (linkTree?.brandName?.trim() ?? brand ?? "");
  const headerImage = isCurrentBrand ? brandContext?.brandImageUrl ?? null : null;
  const headerTitle = isCurrentBrand
    ? (brandContext?.title ?? "")
    : (linkTree?.title?.trim() ?? "");

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/links?brand=${encodeURIComponent(brand)}`
        );
        const data = await res.json();
        if (!cancelled && res.ok) setLinkTree(data?.linkTree || null);
      } catch {
        if (!cancelled) setLinkTree(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brand]);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: linkTree?.title || "My links",
          text: headerName || "Check out my links",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          alert("Could not copy link");
        }
      }
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy link");
    }
  };

  if (loading) {
    return (
      <div className="font-baloo min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#00888E" }}>
        <p className="text-white">Loading…</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="font-baloo min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#00888E" }}>
        <p className="text-white">Add ?brand=... to the URL to view a link tree.</p>
      </div>
    );
  }

  const links = linkTree?.links ?? [];
  const hasLinks = links.some((l) => (l.label || "").trim() && (l.url || "").trim());

  if (!hasLinks) {
    return (
      <div className="font-baloo min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#00888E" }}>
        <p className="text-white">No links yet for this brand.</p>
      </div>
    );
  }

  const visibleLinks = links.filter((l) => (l.label || "").trim() && (l.url || "").trim());

  return (
    <div
      className="font-baloo min-h-screen py-8 px-4 flex items-center justify-center"
      style={{ backgroundColor: "#00888E" }}
    >
      <div className="w-full max-w-md flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={navigator.share ? handleShare : copyLink}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Share"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="pt-10 pb-6 px-6 flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col items-center text-center flex-shrink-0">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full border-2 border-white shadow-lg overflow-hidden bg-gray-200 ring-2 ring-gray-100">
                  {headerImage ? (
                    <img
                      src={headerImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                      {(headerName || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight uppercase">
                {headerName || brand}
              </h1>
              {headerTitle ? (
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  {headerTitle}
                </p>
              ) : null}
            </div>

            <div className="mt-6 space-y-3 flex-1 min-h-0 overflow-y-auto">
              {visibleLinks.map((link, index) => {
                const initial = (link.label || "").charAt(0).toUpperCase() || "?";
                const hasImage = link.image && link.image.trim();
                const subtitle = domainLabel(link.url);
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left group"
                  >
                    <span className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-gray-600">
                      {hasImage ? (
                        <img
                          src={link.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">{initial}</span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {link.label}
                      </p>
                      {subtitle ? (
                        <p className="text-sm text-gray-500 truncate">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="flex-shrink-0 p-1 text-gray-400 group-hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
