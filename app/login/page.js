"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Detect in-app browser
  useEffect(() => {
    const detectInAppBrowser = () => {
      if (typeof window === "undefined") return false;

      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /Android/.test(ua);

      // Check for common in-app browsers
      const inAppPatterns = [
        /FBAN|FBAV/i, // Facebook
        /Instagram/i, // Instagram
        /Twitter/i, // Twitter
        /LinkedInApp/i, // LinkedIn
        /KAKAOTALK/i, // KakaoTalk
        /Line/i, // Line
        /wv|WebView/i, // Generic WebView
        /;fb|;iab/i, // Facebook in-app browser
        /Version.*Chrome\/[.0-9]* Mobile.*Safari/i, // Some mobile apps
      ];

      // Check for iOS in-app browsers
      const isIOSInApp =
        isIOS &&
        (inAppPatterns.some((pattern) => pattern.test(ua)) ||
          !window.safari || // Real Safari has window.safari
          navigator.standalone === false); // PWA detection

      // Check for Android in-app browsers
      const isAndroidInApp =
        isAndroid &&
        (inAppPatterns.some((pattern) => pattern.test(ua)) || /wv/i.test(ua)); // WebView indicator

      return (
        isIOSInApp ||
        isAndroidInApp ||
        inAppPatterns.some((pattern) => pattern.test(ua))
      );
    };

    setIsInAppBrowser(detectInAppBrowser());
  }, []);

  // Copy current URL to clipboard
  const copyCurrentLink = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    }
  };

  // Get browser-specific instructions
  const getBrowserInstructions = () => {
    const ua = navigator.userAgent || "";

    if (/LinkedInApp/i.test(ua)) {
      return {
        app: "LinkedIn",
        instruction:
          'Tap the three dots (•••) in the top right, then "Open in Browser"',
      };
    } else if (/FBAN|FBAV/i.test(ua)) {
      return {
        app: "Facebook",
        instruction:
          'Tap the three dots (•••) in the top right, then "Open in Browser"',
      };
    } else if (/Instagram/i.test(ua)) {
      return {
        app: "Instagram",
        instruction:
          'Tap the three dots (•••) in the top right, then "Open in Browser"',
      };
    } else if (/Twitter/i.test(ua)) {
      return {
        app: "Twitter/X",
        instruction: 'Tap the share icon, then "Open in Browser"',
      };
    } else {
      return {
        app: "this app",
        instruction:
          'Look for "Open in Browser" or "Open in Safari/Chrome" option',
      };
    }
  };

  const browserInfo = getBrowserInstructions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-semibold mb-6 text-slate-800 text-center">
          Sign in to Kavisha.ai
        </h1>

        {/* In-app browser warning */}
        {isInAppBrowser && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800 mb-2">
                  Browser Compatibility Issue
                </p>
                <p className="text-amber-700 mb-3">
                  You're browsing from <strong>{browserInfo.app}</strong>.
                  Google sign-in is blocked in in-app browsers for security
                  reasons.
                </p>

                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-amber-800 mb-1">
                      Option 1: Open in Browser
                    </p>
                    <p className="text-amber-700 text-xs">
                      {browserInfo.instruction}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-amber-800 mb-2">
                      Option 2: Copy Link
                    </p>
                    <button
                      onClick={copyCurrentLink}
                      className="w-full py-2 px-3 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors relative"
                    >
                      {showCopySuccess
                        ? "✓ Link Copied!"
                        : "📋 Copy Link to Clipboard"}
                    </button>
                    {showCopySuccess && (
                      <p className="text-xs text-amber-600 mt-1">
                        Now paste it in Safari or Chrome
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular login for secure browsers */}
        {!session?.user ? (
          <div className="w-full">
            <button
              onClick={() => signIn("google")}
              disabled={isInAppBrowser}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isInAppBrowser
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {isInAppBrowser ? "🔒 Sign-in Blocked" : "Login with Google"}
            </button>

            {isInAppBrowser && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Please use the options above to continue
              </p>
            )}
          </div>
        ) : (
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

        {/* General info for secure browsers */}
        {!isInAppBrowser && !session?.user && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 text-center">
            <p>
              ✅ Secure browser detected. Google sign-in will work normally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
