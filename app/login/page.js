"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "../components/Loader";

// Constants
const IN_APP_BROWSER_PATTERNS = [
  /FBAN|FBAV/i, // Facebook
  /Instagram/i, // Instagram
  /Twitter/i, // Twitter
  /LinkedInApp/i, // LinkedIn
  /;fb|;iab/i, // Facebook in-app browser
];

const LEGITIMATE_BROWSER_PATTERNS = {
  SAFARI: /Safari/i,
  VERSION: /Version/i,
  CHROME: /Chrome\//i,
  SAMSUNG: /SamsungBrowser/i,
  WEBVIEW: /wv/i,
  IOS_CHROME: /CriOS/i,
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod|Android/i.test(ua);
};

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
        LEGITIMATE_BROWSER_PATTERNS.IOS_CHROME.test(ua)) &&
      !IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));

    if (isLegitimateIOSBrowser) return false;

    return (
      typeof window.safari === "undefined" && navigator.standalone !== true
    );
  }

  return false;
};

const openInChrome = () => {
  const currentUrl = window.location.href;
  const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, "")}`;
  window.location.href = chromeUrl;
};

export default function LoginPage() {
  const { user, loading, refresh } = useFirebaseSession();
  const brand = useBrandContext();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
    // if (user) {
    //   router.push("/");
    // }
  }, [user]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    try {
      await signIn();
      refresh();
      router.push("/");
    } catch (e) {
      setError(e.message || "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  };

  const isBlocked = isInAppBrowser && isMobile;
  const shouldShowGoogleLogin = !isBlocked && !user && !loading;

  // Show loader while checking session
  if (loading) {
    return <Loader loadingMessage="Checking session..." />;
  }

  return (
    <div className="h-full overflow-y-auto mx-auto w-full lg:max-w-[60%] px-8 py-8 space-y-8">
      <div className="mt-4 h-48 sm:h-80 w-full  rounded-xl">
        <img
          src={brand?.brandImageUrl}
          alt={brand?.brandName || "Brand"}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-center mx-auto max-w-4xl">
        <p className="text-2xl sm:text-4xl lg:text-6xl font-bold my-2">
          {brand?.title}
        </p>
        <p className="text-gray-500 text-sm sm:text-base leading-relaxed px-4">
          {brand?.subtitle}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg max-w-md mx-auto text-sm text-center">
          {error}
        </div>
      )}

      {isBlocked && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-gray-700 mb-4 text-center">
            Please open in Chrome to continue
          </p>
          <button
            onClick={openInChrome}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Open in Chrome
          </button>
        </div>
      )}

      <div className="flex justify-center pb-8">
        {shouldShowGoogleLogin && (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="px-6 py-3 bg-sky-700 text-white rounded-md text-lg font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {signingIn ? (
              <span>Signing in...</span>
            ) : (
              brand?.loginButtonText || "Talk to Kavisha now"
            )}
          </button>
        )}

        {isBlocked && (
          <button
            disabled
            className="px-6 py-3 bg-gray-300 text-gray-500 rounded-md text-lg font-medium cursor-not-allowed"
          >
            🔒 Sign-in Blocked in App Browser
          </button>
        )}
      </div>
    </div>
  );
}
