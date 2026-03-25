"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import {
  Share2,
  Check,
  MoreVertical,
  Youtube,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
} from "lucide-react";

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

const SOCIAL_ICONS = [
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "twitter", label: "Twitter", Icon: Twitter },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
];

function socialHref(url) {
  const u = (url || "").trim();
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function hasVisibleSocial(social) {
  if (!social || typeof social !== "object") return false;
  return SOCIAL_ICONS.some(({ key }) => {
    const s = social[key];
    return !!(s?.enabled && (s?.url || "").trim());
  });
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

  const headerName = brandContext?.brandName?.trim() || brand || "";
  const headerImage = brandContext?.brandImageUrl ?? null;
  const headerTitle = brandContext?.title?.trim() || "";

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
          title: headerTitle || headerName || "My links",
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

  const shellClass =
    "font-baloo flex min-h-screen items-center justify-center bg-background p-4 text-muted md:bg-muted-bg md:text-foreground";

  if (loading) {
    return (
      <div className={shellClass}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className={shellClass}>
        <p className="text-center">
          Add ?brand=... to the URL to view a link tree.
        </p>
      </div>
    );
  }

  const links = linkTree?.links ?? [];
  const hasLinks = links.some((l) => (l.label || "").trim() && (l.url || "").trim());
  const social = linkTree?.social;
  const anySocial = hasVisibleSocial(social);

  if (!hasLinks && !anySocial) {
    return (
      <div className={shellClass}>
        <p className="text-center">No links yet for this brand.</p>
      </div>
    );
  }

  const visibleLinks = links.filter((l) => (l.label || "").trim() && (l.url || "").trim());

  return (
    <div
      className="font-baloo flex min-h-[100dvh] w-full flex-col bg-background md:min-h-screen md:flex-row md:items-center md:justify-center md:bg-muted-bg md:px-4 md:py-8"
    >
      <div className="flex w-full flex-1 flex-col md:max-h-[calc(100vh-4rem)] md:max-w-md md:flex-none">
        <div className="relative flex flex-1 flex-col overflow-hidden bg-card md:max-h-[calc(100vh-4rem)] md:rounded-2xl md:shadow-xl">
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={navigator.share ? handleShare : copyLink}
              className="rounded-full p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
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
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-muted-bg shadow-lg ring-2 ring-border">
                  {headerImage ? (
                    <img
                      src={headerImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted">
                      {(headerName || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight uppercase">
                {headerName || brand}
              </h1>
              {headerTitle ? (
                <p className="mt-1 max-w-xs text-sm text-muted">
                  {headerTitle}
                </p>
              ) : null}
            </div>

            <div
              className={`mt-6 flex-1 min-h-0 overflow-y-auto ${visibleLinks.length ? "space-y-3" : ""}`}
            >
              {visibleLinks.map((link, index) => {
                const initial =
                  (link.label || "").charAt(0).toUpperCase() || "?";
                const hasImage = link.image && link.image.trim();
                const subtitle = domainLabel(link.url);
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-all hover:bg-muted-bg hover:shadow-md"
                  >
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted-bg text-muted">
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
                      <p className="truncate font-semibold text-foreground">
                        {link.label}
                      </p>
                      {subtitle ? (
                        <p className="truncate text-sm text-muted">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="flex-shrink-0 p-1 text-muted group-hover:text-foreground">
                      <MoreVertical className="w-5 h-5" />
                    </span>
                  </a>
                );
              })}
            </div>

            {anySocial ? (
              <div className="mt-auto flex flex-shrink-0 flex-wrap items-center justify-center gap-6 border-t border-border py-4">
                {SOCIAL_ICONS.map(({ key, label, Icon }) => {
                  const s = social[key];
                  if (!s?.enabled || !(s.url || "").trim()) return null;
                  return (
                    <a
                      key={key}
                      href={socialHref(s.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="text-muted transition-colors hover:text-[#00888E]"
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
