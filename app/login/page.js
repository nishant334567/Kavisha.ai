"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";

// Constants
const BROWSER_TYPES = {
  CHROME: "chrome",
  SAFARI: "safari",
};

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
 * Opens the current page in a specific browser
 */
const openInSpecificBrowser = async (browserType) => {
  const currentUrl = window.location.href;

  switch (browserType) {
    case BROWSER_TYPES.CHROME:
      const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, "")}`;
      window.location.href = chromeUrl;
      break;

    case BROWSER_TYPES.SAFARI:
      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Kavisha.ai Login",
            url: currentUrl,
          });
          return;
        } catch (err) {
          // Silently fall through to fallback
        }
      }

      // Fallback: Force new navigation
      const separator = currentUrl.includes("?") ? "&" : "?";
      const urlWithParam = `${currentUrl}${separator}openInBrowser=${Date.now()}`;
      window.location.href = urlWithParam;
      break;

    default:
      console.warn(`Unknown browser type: ${browserType}`);
  }
};

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Memoize mobile detection
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Memoize browser opening handler
  const handleBrowserOpen = useCallback((browserType) => {
    openInSpecificBrowser(browserType);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-semibold mb-6 text-slate-800 text-center">
          Sign in to Kavisha.ai
        </h1>

        {/* Browser options for mobile in-app browsers */}
        {shouldShowBrowserOptions && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-4 text-center">
              Please open in a browser to continue
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleBrowserOpen(BROWSER_TYPES.CHROME)}
                className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Open in Chrome
              </button>

              <button
                onClick={() => handleBrowserOpen(BROWSER_TYPES.SAFARI)}
                className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Open in Safari
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
          <div className="flex flex-col items-center gap-4 w-full">
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
    </div>
  );
}
