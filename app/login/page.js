"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";

// Constants
const IN_APP_BROWSER_PATTERNS = [
  /FBAN|FBAV/i, // Facebook
  /Instagram/i, // Instagram
  /Twitter/i, // Twitter
  /LinkedInApp/i, // LinkedIn
  /KAKAOTALK/i, // KakaoTalk
  /Line/i, // Line
  /;fb|;iab/i, // Facebook in-app browser
  /Snapchat/i, // Snapchat
  /WeChat/i, // WeChat
  /TikTok/i, // TikTok
];

const LEGITIMATE_BROWSER_PATTERNS = {
  SAFARI: /Safari/i,
  VERSION: /Version/i,
  CHROME: /Chrome\//i,
  SAMSUNG: /SamsungBrowser/i,
  WEBVIEW: /wv/i,
  IOS_CHROME: /CriOS/i,
  IOS_FIREFOX: /FxiOS/i,
  IOS_OPERA: /OPiOS/i,
};

/**
 * Detects if the current environment is a mobile device
 */
const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod|Android/i.test(ua);
};

/**
 * Detects if current browser is an in-app browser
 */
const detectInAppBrowser = () => {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);

  // Check for known in-app browser patterns
  if (IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua))) {
    return true;
  }

  // Android-specific detection
  if (isAndroid) {
    const isWebView =
      LEGITIMATE_BROWSER_PATTERNS.WEBVIEW.test(ua) &&
      !LEGITIMATE_BROWSER_PATTERNS.CHROME.test(ua);
    const isLegitimate =
      LEGITIMATE_BROWSER_PATTERNS.CHROME.test(ua) ||
      LEGITIMATE_BROWSER_PATTERNS.SAMSUNG.test(ua);

    return !isLegitimate && isWebView;
  }

  // iOS-specific detection
  if (isIOS) {
    const isLegitimateIOSBrowser =
      ((LEGITIMATE_BROWSER_PATTERNS.SAFARI.test(ua) &&
        LEGITIMATE_BROWSER_PATTERNS.VERSION.test(ua)) ||
        LEGITIMATE_BROWSER_PATTERNS.IOS_CHROME.test(ua) ||
        LEGITIMATE_BROWSER_PATTERNS.IOS_FIREFOX.test(ua) ||
        LEGITIMATE_BROWSER_PATTERNS.IOS_OPERA.test(ua)) &&
      !IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));

    if (isLegitimateIOSBrowser) return false;

    // Check WebView indicators
    const hasNoSafariObject = typeof window.safari === "undefined";
    const isStandalone = navigator.standalone === true;

    return hasNoSafariObject && !isStandalone;
  }

  return false;
};

/**
 * Opens the current page in Chrome browser
 */
const openInChrome = () => {
  const currentUrl = window.location.href;
  const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, "")}`;
  window.location.href = chromeUrl;
};

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Memoize mobile detection
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Memoize browser opening handler
  const handleChromeOpen = useCallback(() => {
    openInChrome();
  }, []);

  // Detect in-app browser on mount
  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
  }, []);

  // Computed values
  const shouldShowBrowserOptions = isInAppBrowser && isMobile;
  const shouldShowGoogleLogin =
    (!isInAppBrowser || !isMobile) && !session?.user;
  const shouldShowBlockedMessage = isInAppBrowser && isMobile;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
              K
            </div>
            <span className="text-xl font-bold text-gray-900">Kavisha.ai</span>
          </div>
          {/* Login button moved to the card to avoid duplicates */}
        </div>
      </header>

      {/* Hero + Login Card */}
      <main className="max-w-6xl mx-auto w-full px-4 py-12 grid md:grid-cols-2 gap-10 items-start flex-1">
        {/* Hero */}
        <section>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Human connections in the age of AI.{" "}
            <span className="text-orange-500">Kavisha</span>
          </h1>
          <p className="text-gray-600 text-lg mb-6 max-w-xl">
            Kavisha connects people by first understanding what they truly want.
            Using smart, empathetic conversations, Kavisha is making great
            connections. In the world of recruitment, for now.
          </p>

          <ul className="space-y-3 text-gray-700 mb-8">
            <li className="flex items-start gap-3">
              <span className="text-orange-500">✓</span>
              <span>
                Respectful conversations for job seekers and recruiters
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-500">✓</span>
              <span>
                ⁠⁠Deep qualification and matching for both sides to arrive at
                perfect “connections”
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-orange-500">✓</span>
              <span>⁠⁠Reduced hassle, effort, and time to hire</span>
            </li>
          </ul>

          {/* CTA intentionally removed to keep a single login entry point */}
        </section>

        {/* Existing Login Card (implementation preserved) */}
        <aside>
          <div className="bg-white rounded-xl shadow-lg p-6 w-full border border-gray-100">
            <h2 className="text-2xl font-semibold mb-3 text-slate-800 text-center">
              Sign in to Kavisha.ai
            </h2>
            {/* Minimal intro inside card for compact view */}
            <div className="text-center text-gray-600 mb-5">
              <p className="text-sm">
                Build meaningful connections with an AI assistant that
                understands you.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-gray-600 mb-4">
              <div className="p-2 border border-gray-200 rounded">
                Human‑first
              </div>
              <div className="p-2 border border-gray-200 rounded">
                AI‑powered
              </div>
              <div className="p-2 border border-gray-200 rounded">
                Efficient
              </div>
            </div>

            {/* Chrome option for mobile in-app browsers */}
            {shouldShowBrowserOptions && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700 mb-4 text-center">
                  Please open in Chrome to continue
                </p>

                <div className="space-y-2">
                  <button
                    onClick={handleChromeOpen}
                    className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Open in Chrome
                  </button>
                </div>
              </div>
            )}

            {/* Google login for secure browsers */}
            {shouldShowGoogleLogin && (
              <div className="w-full">
                <button
                  onClick={() => signIn("google")}
                  className="w-full py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Login with Google
                </button>
              </div>
            )}

            {/* Blocked message for mobile in-app browsers */}
            {shouldShowBlockedMessage && (
              <div className="w-full">
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium"
                >
                  🔒 Sign-in Blocked in App Browser
                </button>
              </div>
            )}

            {/* User session info */}
            {session?.user && (
              <div className="flex flex-col items-center gap-4 w-full mt-4">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt="User Avatar"
                    className="w-16 h-16 rounded-full border-2 border-slate-200"
                  />
                )}
                <p className="text-lg text-slate-700 text-center">
                  Welcome, {session.user.name}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go To Homepage
                </button>
                <button
                  onClick={() => signOut()}
                  className="w-full py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Kavisha.ai</p>
        </div>
      </footer>
    </div>
  );
}
