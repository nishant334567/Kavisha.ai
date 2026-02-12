"use client";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { signIn } from "../lib/firebase/sign-in";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { useState, useEffect } from "react";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";

export default function AvatarHomepage() {
  const brand = useBrandContext();
  const router = useRouter();
  const { user, refresh } = useFirebaseSession();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError("");
    setPopupBlocked(false);
    try {
      await signIn();
      await refresh();
      // Force a hard refresh to ensure state is updated
      // window.location.href = "/";
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlocked(true);
      } else {
        setError(e.message || "Sign in failed");
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="md:mt-12 flex-1 overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 pt-2 space-y-4 pb-8 md:pb-24">
        <div className="md:hidden flex gap-4 my-2 px-4">
          <img
            src={brand?.logoUrl}
            className="rounded-full w-10 h-10 object-cover"
            alt={brand?.brandName}
          />
          <div className="flex justify-center items-center">
            <p className="font-akshar font-medium text-foreground">
              {brand?.brandName?.toUpperCase()}
            </p>
          </div>
        </div>

        {brand?.brandImageUrl && (
          <img
            src={brand.brandImageUrl}
            alt={brand?.brandName?.toUpperCase() || "Brand"}
            className="w-full md:max-h-[50vh] object-cover md:rounded-lg"
          />
        )}

        <div className="text-center mx-auto max-w-4xl px-4">
          <p className="font-fredoka font-normal text-3xl my-2 mb-4 text-foreground">
            {brand?.title}
          </p>
          <p className="font-fredoka leading-relaxed px-4 text-foreground">
            {brand?.subtitle}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg max-w-md mx-auto text-sm text-center">
            {error}
          </div>
        )}

        {popupBlocked && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto text-sm text-center">
            Popup was blocked. Try again — it&apos;ll work.
          </div>
        )}

        {isInAppBrowser && isMobile && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 text-center">
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

        {/* Button in normal flow for both mobile and desktop; hide when in-app browser on mobile */}
        <div className="flex justify-center items-center gap-3 py-6 flex-wrap">
          {!(isInAppBrowser && isMobile) && (
            user ? (
              <>
                <button
                  onClick={() => router.push("/chats")}
                  className="font-akshar px-6 py-3 rounded-full bg-[#59646F] dark:bg-muted-bg text-md border-2 border-[#59646F] dark:border-border flex items-center gap-2 text-[#FFEED8] dark:text-foreground hover:bg-[#4a5568] dark:hover:bg-border transition-colors"
                >
                  YOUR CHATS
                </button>
                <button
                  onClick={() => router.push("/community")}
                  className="font-akshar px-6 py-3 rounded-full bg-white dark:bg-background text-md border-2 border-[#59646F] dark:border-border text-[#59646F] dark:text-foreground hover:bg-gray-50 dark:hover:bg-muted-bg transition-colors"
                >
                  COMMUNITY
                </button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="font-akshar px-6 py-3 rounded-full bg-[#59646F] dark:bg-muted-bg text-md disabled:opacity-50 flex items-center gap-2 text-[#FFEED8] dark:text-foreground hover:bg-[#4a5568] dark:hover:bg-border transition-colors"
              >
                {signingIn ? (
                  <span>Signing in...</span>
                ) : (
                  brand?.loginButtonText?.toUpperCase() || "TALK TO ME NOW"
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
