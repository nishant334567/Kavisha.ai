"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { Twitter, Linkedin } from "lucide-react";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";

const linkClass =
  "font-figtree text-sm text-muted transition-colors hover:text-accent";

export default function Footer() {
  const { user, refresh } = useFirebaseSession();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const isBlocked = isInAppBrowser && isMobile;

  const handleSignIn = async (redirectPath) => {
    try {
      if (redirectPath && typeof window !== "undefined") {
        const path = typeof redirectPath === "string" && redirectPath.startsWith("/") ? redirectPath : "/";
        localStorage.setItem("redirectAfterLogin", path);
      }
      await signIn();
      await refresh();
    } catch (e) {
      // popup blocked etc. – user can retry
    }
  };

  const authLink = (href, label) =>
    user ? (
      <Link href={href} className={linkClass}>
        {label}
      </Link>
    ) : isBlocked ? (
      <button
        type="button"
        onClick={openInChrome}
        className={`${linkClass} text-left bg-transparent border-0 p-0 cursor-pointer`}
      >
        Open in Chrome to sign in
      </button>
    ) : (
      <button
        type="button"
        onClick={() => handleSignIn(href)}
        className={`${linkClass} text-left bg-transparent border-0 p-0 cursor-pointer`}
      >
        {label}
      </button>
    );

  return (
    <footer className="relative overflow-hidden border-t border-border/50 bg-[linear-gradient(180deg,var(--background)_0%,color-mix(in_srgb,var(--accent)_5%,var(--muted-bg))_100%)] px-5 py-14 md:px-8 md:py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[min(80vw,32rem)] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-8">
          <div>
            <p className="landing-label mb-4">Kavisha</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/tnc" className={linkClass}>
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className={linkClass}>
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/help" className={linkClass}>
                  Help
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="landing-label mb-4">Features</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/make-avatar" className={linkClass}>
                  Make my Avataar
                </Link>
              </li>
              <li>{authLink("/talk-to-avatar", "Talk to Avataars")}</li>
            </ul>
          </div>

          <div className="md:ml-auto">
            <p className="landing-label mb-4">Connect</p>
            <ul className="flex gap-3 md:flex-col md:gap-2.5">
              <li>
                <a
                  href="https://x.com/kavishaai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2 font-figtree text-sm text-muted backdrop-blur-sm transition-colors hover:border-accent/30 hover:text-accent"
                >
                  <Twitter className="h-4 w-4" />
                  <span>Twitter</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/company/kavisha-ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2 font-figtree text-sm text-muted backdrop-blur-sm transition-colors hover:border-accent/30 hover:text-accent"
                >
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-8 text-center md:mt-14">
          <p className="font-figtree text-xs text-muted">
            Copyright © 2026 Kavisha. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
