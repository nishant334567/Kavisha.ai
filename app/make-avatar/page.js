"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";

export default function MakeAvatarLandingPage() {
  const router = useRouter();
  const { user, refresh } = useFirebaseSession();
  const [signingIn, setSigningIn] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [popupBlockedHint, setPopupBlockedHint] = useState(false);
  const [hasCreatedAvatar, setHasCreatedAvatar] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const isBlocked = isInAppBrowser && isMobile;

  useEffect(() => {
    if (!user?.email) {
      setCheckingAvatar(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user");
        const data = res.ok ? await res.json() : null;
        if (!cancelled && data?.user?.hasCreatedAvatar) setHasCreatedAvatar(true);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setCheckingAvatar(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const handleGetStarted = async () => {
    if (hasCreatedAvatar) return;
    if (user) {
      router.push("/make-avatar/v2");
      return;
    }
    if (isBlocked) {
      openInChrome();
      return;
    }
    setSigningIn(true);
    setPopupBlockedHint(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("redirectAfterLogin", "/make-avatar/v2");
      }
      await signIn();
      await refresh();
      router.push("/make-avatar/v2");
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlockedHint(true);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      <main className="pb-12 px-4">
        {/* Back arrow */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-900 hover:opacity-80 mt-4 mb-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Logo */}
        <div className="flex justify-center my-6">
          <img src="/kavisha-logo.png" width={120} height={120} alt="Kavisha" />
        </div>

        {/* Title */}
        <h1 className="text-center text-3xl md:text-4xl font-bold mb-2">
          <span className="text-[#2d4752]">Make my </span>
          <span className="text-[#00B5BD]">Avataar</span>
        </h1>
        <p className="text-center text-gray-600 text-base md:text-lg max-w-xl mx-auto mb-10">
          Create your Avataar and give your fans/customers the pleasure of personal conversations with you. 24x7x365.
        </p>

        {isBlocked && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto text-center">
            <p className="text-sm text-amber-800 mb-2">Please open this page in Chrome to sign in and continue.</p>
            <button
              type="button"
              onClick={openInChrome}
              className="py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
            >
              Open in Chrome
            </button>
          </div>
        )}

        {popupBlockedHint && !isBlocked && (
          <p className="text-center text-amber-600 text-sm mb-4">Popup was blocked. Try again — it&apos;ll work.</p>
        )}

        {/* Cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free card - dark teal */}
          <div className="rounded-2xl bg-[#35515b] text-white p-6 md:p-8 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">Free</h2>
            <p className="text-white/95 text-sm mb-4">A Digital Avataar that you build from scratch</p>
            <p className="text-2xl md:text-3xl font-bold mb-1">₹0 /month</p>
            <p className="text-sm text-white/90 mb-6">(up to 500 chats*)</p>
            <ul className="space-y-2 text-sm text-white/95 mb-6 flex-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                Customize your personality
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                Create your knowledge base
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                Advanced personalized dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                &apos;Connect with other fans&apos; for your community
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                List your products/services for sale
              </li>
            </ul>
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={signingIn || hasCreatedAvatar || checkingAvatar}
              className="w-full py-3 rounded-lg border-2 border-white/50 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signingIn ? "Signing in…" : isBlocked ? "Open in Chrome to continue" : checkingAvatar ? "Checking…" : "Get started"}
            </button>
            {hasCreatedAvatar && (
              <p className="text-xs text-amber-200 mt-3 text-center">
                Sorry — one avatar per email. You’ve already created yours with this account.
              </p>
            )}
            {!hasCreatedAvatar && <p className="text-xs text-white/80 mt-3 text-center">*Rs. 3/chat beyond 500 chats</p>}
          </div>

          {/* White glove card - cream */}
          <div className="rounded-2xl bg-[#F7F0DD] text-[#264653] p-6 md:p-8 flex flex-col border border-[#E8E0C8]">
            <h2 className="text-2xl font-bold mb-1">White glove service</h2>
            <p className="text-sm mb-4">Your Digital Avataar that we help you build</p>
            <p className="text-lg font-bold mb-4">Up to 10,000 chats in free credits*</p>
            <p className="text-sm mb-3">Includes everything in Free, plus:</p>
            <ul className="space-y-2 text-sm mb-6 flex-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#264653] mt-1.5 shrink-0" />
                We help you customize your Avataar&apos;s personality
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#264653] mt-1.5 shrink-0" />
                We help you create you knowledge base
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#264653] mt-1.5 shrink-0" />
                We calibrate your Avataar&apos;s response with perfect training and testing
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#264653] mt-1.5 shrink-0" />
                Custom built features as per brand requests
              </li>
            </ul>
            <button
              type="button"
              onClick={() => router.push("/help")}
              className="w-full py-3 rounded-lg bg-[#3D5E6B] text-white font-medium hover:bg-[#2d4752] transition-colors"
            >
              Contact us
            </button>
            <p className="text-xs text-gray-600 mt-3 text-center">*Rs. 3/chat beyond 10,000 chats</p>
          </div>
        </div>
      </main>
    </div>
  );
}
