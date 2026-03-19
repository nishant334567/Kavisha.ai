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

  const linksQs = brand?.subdomain
    ? `?brand=${encodeURIComponent(brand.subdomain)}`
    : "";
  /** Logged-in homepage CTAs: only these three */
  const homepageActionLinks = [
    { label: "TALK TO ME", path: "/chats", primary: true },
    { label: "COMMUNITY", path: "/community" },
    { label: "LINKS", path: `/links${linksQs}` },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 pt-2 md:pt-0 space-y-4 pb-32 md:pb-24">
        {/* <div className="md:hidden flex gap-4 my-2 px-4">
          <img
            src={brand?.logoUrl}
            className="rounded-full w-10 h-10 object-cover"
            alt={brand?.brandName}
          />
          <div className="flex justify-center items-center">
            <p className="font-baloo font-medium text-foreground">
              {brand?.brandName?.toUpperCase()}
            </p>
          </div>
        </div> */}

        {brand?.brandImageUrl && (
          <img
            src={brand.brandImageUrl}
            alt={brand?.brandName?.toUpperCase() || "Brand"}
            className="w-full h-[250px] md:max-h-[50vh] object-cover md:rounded-lg"
          />
        )}

        <div className="text-center mx-auto max-w-4xl px-4">
          <p className="font-baloo font-normal text-2xl my-2 mt-6 mb-4 text-foreground">
            {brand?.title}
          </p>
          <p className="font-baloo px-2 text-md text-foreground text-gray-500 text-justify">
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

        {/* Mobile: fixed above bottom nav; md+: normal flow in page */}
        <div className="flex min-h-[3.25rem] w-full items-center justify-center gap-4 px-4 py-4 max-md:fixed max-md:bottom-14 max-md:left-0 max-md:right-0 max-md:z-40 max-md:border-t max-md:border-b max-md:border-gray-200/80 max-md:bg-white/90 max-md:py-4 max-md:backdrop-blur-sm max-md:dark:border-gray-700/80 max-md:dark:bg-gray-950/90 md:relative md:z-auto md:border-0 md:bg-transparent md:py-6 md:backdrop-blur-none md:dark:bg-transparent">
          {!(isInAppBrowser && isMobile) && (
            user ? (
              <>
                {homepageActionLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`font-baloo px-2 py-1 rounded-full text-base font-medium transition-all ${
                      item.primary
                        ? "border-0 bg-gradient-to-r from-[#008282] to-[#17638C] text-white shadow-sm hover:brightness-110 active:brightness-95 dark:from-[#008282] dark:to-[#17638C]"
                        : "border-2 border-[#008282] bg-white text-[#17638C] hover:bg-[#008282]/8 active:bg-[#008282]/12 dark:border-[#008282] dark:bg-background dark:text-[#7dd3fc] dark:hover:bg-[#008282]/20"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="font-baloo flex items-center gap-2 rounded-full bg-gradient-to-r from-[#008282] to-[#17638C] px-6 py-3 text-base font-medium text-white shadow-sm transition-all hover:brightness-110 active:brightness-95 disabled:opacity-50 dark:from-[#008282] dark:to-[#17638C]"
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
