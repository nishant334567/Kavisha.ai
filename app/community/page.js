"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { signIn } from "@/app/lib/firebase/sign-in";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/app/lib/in-app-browser";
import ChatSidebar from "@/app/components/ChatSidebar";
import Loader from "@/app/components/Loader";
import PoweredByKavisha from "@/app/components/PoweredByKavisha";
import CommunityBrandStrip from "@/app/components/CommunityBrandStrip";
import { ArrowLeft } from "lucide-react";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import {
  JOB_SEEKER_CHAT_TITLE,
  JOB_SEEKER_OPENING_MESSAGE,
} from "@/app/lib/jobSeekerIntro";

export default function Community() {
  const router = useRouter();
  const brand = useBrandContext();
  const { user, loading: authLoading, refresh } = useFirebaseSession();
  const [creating, setCreating] = useState(null);
  const [allChats, setAllChats] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [popupBlockedHint, setPopupBlockedHint] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const isBlocked = isInAppBrowser && isMobile;

  const handleSignInToCommunity = async () => {
    if (isBlocked) {
      openInChrome();
      return;
    }
    setSigningIn(true);
    setPopupBlockedHint(false);
    try {
      await signIn();
      await refresh();
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlockedHint(true);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const createCommunityPost = async (type, title, message) => {
    if (!user?.id || !brand?.subdomain) return;

    const services = brand?.services || [];
    const service = services.find((s) => s.name === type);
    const serviceKey = service?._key ?? services[0]?._key;
    if (!serviceKey) return;

    setCreating(type);
    try {
      const res = await fetch("/api/newchatsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: type,
          brand: brand.subdomain,
          initialmessage: message,
          isCommunityChat: true,
          chatName: title,
          serviceKey,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.sessionId) {
        router.push(`/community/${data.sessionId}`);
      }
    } catch (e) {
      console.error("Error creating community session:", e);
    } finally {
      setCreating(null);
    }
  };

  useEffect(() => {
    if (!user || !brand?.subdomain) return;
    const endpoint =
      brand.subdomain === "kavisha"
        ? "/api/allchats?community=true"
        : `/api/allchats/${brand.subdomain}?community=true`;
    (async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        setAllChats(data);
      } catch {
        setAllChats(null);
      }
    })();
  }, [user, brand?.subdomain]);

  const updateChatId = (newChatId) => {
    if (newChatId) router.push(`/community/${newChatId}`);
    else router.push("/community");
  };

  if (authLoading || !brand) {
    return (
      <Loader
        loadingMessage="Loading..."
        primaryHex={
          brand ? normalizeBrandHex(brand.primaryBrandColor) : null
        }
      />
    );
  }

  const primaryHex = normalizeBrandHex(brand?.primaryBrandColor);
  const secondaryHex = normalizeBrandHex(brand?.secondaryBrandColor);
  const rawBrandLabel =
    brand?.brandName || brand?.title || brand?.communityName || brand?.subdomain || "";
  const brandDisplayName = String(rawBrandLabel).trim() || "We";
  const primaryCtaClass =
    "rounded-full px-6 py-3 text-white transition-colors hover:opacity-90 disabled:opacity-50";

  const showJobs = !!brand?.enableProfessionalConnect;
  const showHire = !!brand?.enableProfessionalConnect;
  const showFriends = !!brand?.enableFriendConnect;

  const findJobsMsg = JOB_SEEKER_OPENING_MESSAGE;
  const hireMsg =
    "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can be done. :)";
  const friendsMsg =
    "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can be done. :)";

  const hubButtonClass =
    "w-full max-w-xs rounded-full px-5 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-45 sm:px-6 sm:py-3.5 sm:text-base " +
    (!primaryHex ? "bg-highlight" : "");
  const hubButtonStyle = primaryHex
    ? { backgroundColor: primaryHex }
    : undefined;

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md text-center">
          <h1
            className={`mb-4 text-2xl uppercase tracking-wide md:text-3xl ${!secondaryHex ? "text-highlight" : ""}`}
            style={secondaryHex ? { color: secondaryHex } : undefined}
          >
            Community
          </h1>
          <p className="mb-8 text-muted">
            Sign in to use the community and connect with people.
          </p>
          {popupBlockedHint && !isBlocked && (
            <p className="mb-4 text-sm text-amber-600">
              Tap again to enable pop-up! Cheers! :)
            </p>
          )}
          {isBlocked ? (
            <button
              type="button"
              onClick={openInChrome}
              className={`${primaryCtaClass} ${!primaryHex ? "bg-highlight" : ""}`}
              style={primaryHex ? { backgroundColor: primaryHex } : undefined}
            >
              Open in Chrome to sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignInToCommunity}
              disabled={signingIn}
              className={`${primaryCtaClass} ${!primaryHex ? "bg-highlight" : ""} disabled:opacity-50`}
              style={primaryHex ? { backgroundColor: primaryHex } : undefined}
            >
              {signingIn ? "Signing in..." : "Sign in to continue"}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/")}
            className={`mx-auto mt-6 flex items-center justify-center gap-2 hover:opacity-80 ${!primaryHex ? "text-highlight" : ""}`}
            style={primaryHex ? { color: primaryHex } : undefined}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      <CommunityBrandStrip
        communityName={brand?.communityName || "Community"}
        primaryHex={primaryHex}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div>
          <ChatSidebar
            allChats={allChats}
            updateChatId={updateChatId}
            currentChatId={null}
            setCurrentChatType={() => {}}
            onCollapsedChange={() => {}}
            isCommunity={true}
            onNewCommunityChat={createCommunityPost}
            chatBasePath="/community"
            homePath="/community"
            defaultCollapsed={true}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="mt-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={`-mb-1 flex items-center gap-2 py-1 pl-4 transition-colors hover:opacity-80 ${!primaryHex ? "text-highlight" : ""}`}
                style={primaryHex ? { color: primaryHex } : undefined}
              >
                <ArrowLeft className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Back</span>
              </button>

              {!brand?.enableProfessionalConnect && !brand?.enableFriendConnect ? (
                <div className="px-4 py-12 text-center text-lg text-muted opacity-60">
                  Community is not available right now.
                </div>
              ) : (
                <div className="flex min-h-[calc(100vh-220px)] flex-col items-center justify-center gap-4 px-4 py-10 sm:gap-5 sm:py-16">
                  <p className="max-w-md text-center text-sm font-extralight text-muted sm:text-base">
                    <span className="font-medium text-foreground">
                      {brandDisplayName}
                    </span>{" "}
                    is helping people find jobs, hire people, and even connect
                    for friendly collaborations. Talk to our agent, and
                    we&apos;ll help you out! :)
                  </p>
                  <nav
                    className="flex w-full flex-col items-center gap-3 sm:gap-4"
                    aria-label="Community entry"
                  >
                    {showJobs ? (
                      <button
                        type="button"
                        className={hubButtonClass}
                        style={hubButtonStyle}
                        disabled={creating === "job_seeker"}
                        onClick={() =>
                          createCommunityPost(
                            "job_seeker",
                            JOB_SEEKER_CHAT_TITLE,
                            findJobsMsg
                          )
                        }
                      >
                        {creating === "job_seeker" ? "Starting…" : "Find jobs"}
                      </button>
                    ) : null}
                    {showHire ? (
                      <button
                        type="button"
                        className={hubButtonClass}
                        style={hubButtonStyle}
                        disabled={creating === "recruiter"}
                        onClick={() =>
                          createCommunityPost(
                            "recruiter",
                            "Looking at hiring",
                            hireMsg
                          )
                        }
                      >
                        {creating === "recruiter" ? "Starting…" : "Hire people"}
                      </button>
                    ) : null}
                    {showFriends ? (
                      <button
                        type="button"
                        className={hubButtonClass}
                        style={hubButtonStyle}
                        disabled={creating === "friends"}
                        onClick={() =>
                          createCommunityPost(
                            "friends",
                            "Looking for a friend",
                            friendsMsg
                          )
                        }
                      >
                        {creating === "friends" ? "Starting…" : "Find friends"}
                      </button>
                    ) : null}
                  </nav>
                </div>
              )}
            </div>
          </div>
          <PoweredByKavisha />
        </div>
      </div>
    </div>
  );
}
