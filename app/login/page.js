"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Detect in-app browser
  useEffect(() => {
    const detectInAppBrowser = () => {
      if (typeof window === "undefined") return false;

      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /Android/.test(ua);

      // Check for specific in-app browser patterns
      const inAppPatterns = [
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

      // Check if any in-app pattern matches
      const hasInAppPattern = inAppPatterns.some((pattern) => pattern.test(ua));
      if (hasInAppPattern) return true;

      // More specific WebView detection for Android
      if (isAndroid) {
        const isWebView = /wv/i.test(ua) && !/Chrome\//.test(ua);
        const isSamsungBrowser = /SamsungBrowser/i.test(ua);
        const isChrome = /Chrome\//.test(ua) && !/wv/i.test(ua);

        // If it's clearly Chrome or Samsung browser, it's not in-app
        if (isChrome || isSamsungBrowser) return false;

        return isWebView;
      }

      // iOS specific detection
      if (isIOS) {
        // Check for real Safari
        const isSafari =
          /Safari/i.test(ua) &&
          /Version/i.test(ua) &&
          !/CriOS|FxiOS|OPiOS/i.test(ua);
        const isChrome = /CriOS/i.test(ua); // Chrome on iOS
        const isFirefox = /FxiOS/i.test(ua); // Firefox on iOS
        const isOpera = /OPiOS/i.test(ua); // Opera on iOS

        // If it's a known real browser, it's not in-app
        if (isSafari || isChrome || isFirefox || isOpera) return false;

        // Check for iOS WebView indicators
        const hasNoSafariObject = typeof window.safari === "undefined";
        const isStandalone = navigator.standalone === true;

        // If it has no Safari object and is not in standalone mode, might be WebView
        return hasNoSafariObject && !isStandalone;
      }

      return false;
    };

    setIsInAppBrowser(detectInAppBrowser());
  }, []);

  // Try to open in specific browser
  const openInBrowser = (browserType) => {
    const currentUrl = window.location.href;

    if (browserType === "chrome") {
      // Chrome URL scheme for both iOS and Android
      const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, "")}`;
      window.location.href = chromeUrl;
    } else if (browserType === "safari") {
      // For iOS Safari - try to open in Safari
      window.open(currentUrl, "_blank");
    }
  };

  // Check if it's mobile
  const isMobile = () => {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod|Android/i.test(ua);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-semibold mb-6 text-slate-800 text-center">
          Sign in to Kavisha.ai
        </h1>

        {/* Simple browser options for mobile in-app browsers */}
        {isInAppBrowser && isMobile() && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-4 text-center">
              Please open in a browser to continue
            </p>

            <div className="space-y-2">
              <button
                onClick={() => openInBrowser("chrome")}
                className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Open in Chrome
              </button>

              <button
                onClick={() => openInBrowser("safari")}
                className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Open in Safari
              </button>
            </div>
          </div>
        )}

        {/* Regular login for secure browsers */}
        {(!isInAppBrowser || !isMobile()) && !session?.user ? (
          <div className="w-full">
            <button
              onClick={() => signIn("google")}
              className="w-full py-3 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Login with Google
            </button>
          </div>
        ) : null}

        {/* Blocked message for mobile in-app browsers */}
        {isInAppBrowser && isMobile() && (
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
            {session.user?.image && (
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
              onClick={() => {
                router.push("/");
              }}
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
