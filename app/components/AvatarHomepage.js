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
import BrandHeroImageFrame from "./BrandHeroImageFrame";
import { DEFAULT_LOGIN_BUTTON_TEXT } from "../lib/loginButtonText";

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
    ...(brand?.enableLinks !== false
      ? [{ label: "LINKS", path: `/links${linksQs}` }]
      : []),
  ];

  const loginLabel =
    brand?.loginButtonText?.toUpperCase() ||
    DEFAULT_LOGIN_BUTTON_TEXT.toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full min-h-0 flex-1 flex-col px-4 py-6 pb-28 md:max-w-6xl md:px-6 md:py-10 md:pb-20">
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:grid-cols-2 lg:min-h-[min(72vh,640px)]">
          {/* Banner */}
          <div className="relative min-h-[200px] bg-muted-bg sm:min-h-[260px] lg:min-h-0">
            {brand?.brandImageUrl ? (
              <BrandHeroImageFrame
                fill
                imageUrl={brand.brandImageUrl}
                alt={brand?.brandName || "Brand"}
                zoom={brand.brandHeroZoom}
                focusX={brand.brandHeroFocusX}
                focusY={brand.brandHeroFocusY}
                className="absolute inset-0 min-h-full rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none"
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center bg-muted-bg text-sm text-muted sm:min-h-[260px] lg:min-h-full">
                {brand?.brandName || "Your avatar"}
              </div>
            )}
          </div>

          {/* Copy + actions */}
          <div className="flex flex-col justify-center gap-5 px-6 py-8 lg:px-10 lg:py-12">
            <div className="space-y-3">
              <h1 className="font-baloo text-2xl font-normal leading-snug text-foreground md:text-3xl">
                {brand?.title}
              </h1>
              {brand?.subtitle ? (
                <p className="font-baloo text-sm leading-relaxed text-muted md:text-base">
                  {brand.subtitle}
                </p>
              ) : null}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            {popupBlocked && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Tap again to enable pop-up.
              </div>
            )}

            {isInAppBrowser && isMobile && (
              <div className="rounded-lg border border-border bg-muted-bg/50 p-3">
                <p className="mb-2 text-center text-sm text-muted">
                  Open in Chrome to continue
                </p>
                <button
                  onClick={openInChrome}
                  className="w-full rounded-lg bg-highlight px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Open in Chrome
                </button>
              </div>
            )}

            {user ? (
              <div className="flex flex-wrap gap-2">
                {homepageActionLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      setLoadingPath(item.path);
                      router.push(item.path);
                    }}
                    disabled={loadingPath !== null}
                    className="font-baloo rounded-full bg-muted-bg px-4 py-2 text-sm font-medium text-highlight transition-colors hover:bg-background disabled:opacity-50"
                  >
                    {loadingPath === item.path ? "Opening…" : item.label}
                  </button>
                ))}
              </div>
            ) : (
              !(isInAppBrowser && isMobile) && (
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className="font-baloo w-fit rounded-full bg-muted-bg px-6 py-2.5 text-sm font-medium text-highlight transition-colors hover:bg-background disabled:opacity-50"
                >
                  {signingIn ? "Signing in…" : loginLabel}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
