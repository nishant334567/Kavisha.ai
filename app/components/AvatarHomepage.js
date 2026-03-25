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
  const [loadingPath, setLoadingPath] = useState(null);

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
  const homepageActionLinks = [
    { label: "TALK TO ME", path: "/chats", primary: true },
    { label: "COMMUNITY", path: "/community" },
    { label: "LINKS", path: `/links${linksQs}` },
  ];
  const contentSpacingClass = user ? "pt-2 md:pt-0" : "pt-2 md:pt-4";

  return (
    <div className="h-full flex flex-col bg-background">
      <div className={`flex-1 overflow-y-auto mx-auto w-full md:max-w-[60%] md:px-8 ${contentSpacingClass} space-y-4 pb-32 md:pb-24`}>
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
          <p className="font-baloo px-2 text-justify text-md text-muted">
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
          <div className="mx-auto mb-6 max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="mb-4 text-center text-sm text-muted">
              Please open in Chrome to continue
            </p>
            <button
              onClick={openInChrome}
              className="w-full rounded-lg bg-[#2D545E] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#264850]"
            >
              Open in Chrome
            </button>
          </div>
        )}

        {user && (
          <div className="hidden w-full items-center justify-center gap-4 px-4 py-6 md:flex">
            {homepageActionLinks.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  setLoadingPath(item.path);
                  router.push(item.path);
                }}
                disabled={loadingPath !== null}
                className="font-baloo rounded-full bg-muted-bg px-4 py-2 text-base font-medium text-highlight shadow-sm transition-colors hover:bg-card hover:opacity-90"
              >
                {loadingPath === item.path ? "Opening..." : item.label}
              </button>
            ))}
          </div>
        )}

        {!user && !(isInAppBrowser && isMobile) && (
          <div className="flex min-h-[3.25rem] w-full items-center justify-center px-4 py-4 md:py-6">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="font-baloo flex items-center gap-2 rounded-full bg-muted-bg px-6 py-3 text-base font-medium text-highlight shadow-sm transition-colors hover:bg-card hover:opacity-90 active:opacity-95 disabled:opacity-50"
            >
              {signingIn ? (
                <span>Signing in...</span>
              ) : (
                brand?.loginButtonText?.toUpperCase() || "TALK TO ME NOW"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
