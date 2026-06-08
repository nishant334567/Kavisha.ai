"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";
import Footer from "../components/Footer";

const UNLIMITED_AVATAR_CREATOR_EMAIL = "hello@kavisha.ai";

const FEATURES = [
  "Customize your personality",
  "Create your knowledge base",
  "Advanced personalized dashboard",
  "'Connect with other fans' for your community",
  "List your products/services for sale",
];

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
  const canCreateUnlimitedAvatars =
    String(user?.email || "").trim().toLowerCase() === UNLIMITED_AVATAR_CREATOR_EMAIL;

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
        if (
          !cancelled &&
          data?.user?.hasCreatedAvatar &&
          !canCreateUnlimitedAvatars
        ) {
          setHasCreatedAvatar(true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setCheckingAvatar(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, canCreateUnlimitedAvatars]);

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

  const ctaLabel = signingIn
    ? "Signing in…"
    : isBlocked
      ? "Open in Chrome to continue"
      : checkingAvatar
        ? "Checking…"
        : "Get started";

  return (
    <main className="min-h-screen overflow-x-hidden bg-background font-baloo text-foreground">
      <div className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="homepage-glow homepage-glow-a opacity-40" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-8 inline-flex items-center gap-2 font-figtree text-sm text-muted transition-colors hover:text-foreground sm:mb-10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.2fr_0.55fr] lg:gap-12">
            <div className="text-center sm:text-left">
              <p className="landing-label">Digital Avataar</p>
              <h1 className="mt-4 text-3xl font-normal leading-[0.95] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Make my <span className="text-accent">Avataar</span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg font-figtree text-sm leading-relaxed text-muted sm:mx-0 sm:mt-6 sm:text-base md:text-lg">
                Create your Avataar and give your fans/customers the pleasure of
                personal conversations with you. 24x7x365.
              </p>

              {isBlocked && (
                <div className="mx-auto mt-8 max-w-md rounded-xl border border-amber-300/40 bg-amber-500/10 p-5 sm:mx-0">
                  <p className="font-figtree text-sm text-amber-800 dark:text-amber-200">
                    Please open this page in Chrome to sign in and continue.
                  </p>
                  <button
                    type="button"
                    onClick={openInChrome}
                    className="mt-3 rounded-lg bg-amber-600 px-4 py-2 font-figtree text-sm font-medium text-white transition-colors hover:bg-amber-700"
                  >
                    Open in Chrome
                  </button>
                </div>
              )}

              {popupBlockedHint && !isBlocked && (
                <p className="mt-6 font-figtree text-sm text-amber-500">
                  Tap again to enable pop-up! Cheers! :)
                </p>
              )}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px]">
                <div className="overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-md">
                  <img
                    src="/kavisha-avataar.png"
                    alt="Digital Avataar preview"
                    className="block w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          <section className="mt-12 sm:mt-16 md:mt-24">
            <div className="overflow-hidden rounded-2xl border border-border bg-card sm:rounded-[1.75rem]">
              <div className="grid md:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-border p-6 sm:p-8 md:border-b-0 md:border-r md:p-12 lg:p-14">
                  <p className="landing-label">Free plan</p>
                  <h2 className="mt-3 text-2xl font-normal text-foreground sm:text-3xl md:text-4xl">
                    Get started
                  </h2>
                  <p className="mt-3 font-figtree text-sm text-muted sm:text-base">
                    A Digital Avataar that you build from scratch
                  </p>

                  <ul className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
                    {FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 font-figtree text-sm text-foreground sm:text-base"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-center bg-muted-bg/50 p-6 sm:p-8 md:p-12 lg:p-14">
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    disabled={signingIn || hasCreatedAvatar || checkingAvatar}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3.5 font-figtree text-sm font-medium text-background transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
                  >
                    {ctaLabel}
                    {!signingIn && !checkingAvatar && !hasCreatedAvatar && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>

                  {hasCreatedAvatar && (
                    <p className="mt-4 text-center font-figtree text-xs text-amber-600 dark:text-amber-400">
                      Sorry — one avatar per email. You&apos;ve already created yours
                      with this account.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
