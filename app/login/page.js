"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getSubdomain } from "@/app/utils/subdomain";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { urlFor } from "../lib/sanity";

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

const hostParts = getSubdomain();
export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const brand = useBrandContext();
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
    <div className="h-screen overflow-y-auto">
      <div className="mx-auto w-full lg:max-w-[60%] flex flex-col items-center px-8 py-8 min-h-[calc(100vh-56px)]">
        <div className="h-48 sm:h-80 w-full overflow-hidden rounded-xl my-4">
          <img
            src={
              brand?.brandImage &&
              urlFor(brand.brandImage).width(800).height(320).url()
            }
            alt={brand?.brandName || "Brand"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center mx-auto max-w-4xl my-4">
          <p className="text-2xl sm:text-4xl lg:text-6xl font-bold my-2">
            {brand?.title}
          </p>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed px-4">
            {brand?.subtitle}
          </p>
        </div>
        <div className="my-6 mb-8">
          <button
            onClick={() => {
              !session?.user?.id
                ? signIn("google", { callbackUrl: "/" })
                : router.push("/");
            }}
            className="px-4 py-2 bg-sky-700 text-white rounded-md"
          >
            {session?.user?.id
              ? "Go to Homepage"
              : brand?.header === "individual"
                ? "Talk to me now"
                : "We are hiring"}
          </button>
        </div>
      </div>
    </div>
  );
}
