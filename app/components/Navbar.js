"use client";
import { useState, useEffect, useRef } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { signOut } from "../lib/firebase/logout";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import {
  Menu,
  Settings,
  X,
  HelpCircle,
  Shield,
  FileText,
  Sparkles,
  MessageCircle,
  MessagesSquare,
  Users,
  Link2,
  ShoppingBag,
  Briefcase,
  BookOpen,
  LogIn,
  LogOut,
  LayoutGrid,
  Chrome,
  Loader2,
} from "lucide-react";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "../lib/in-app-browser";

export default function Navbar() {
  const { user, loading, refresh } = useFirebaseSession();
  const brand = useBrandContext();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [loadingPath, setLoadingPath] = useState(null);
  const [popupBlockedHint, setPopupBlockedHint] = useState(false);
  const [openMenu, setOpenmenu] = useState(false);
  const [showSettingDropdown, setShowsettingDropdown] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const settingDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingDropdownRef.current &&
        !settingDropdownRef.current.contains(event.target)
      ) {
        setShowsettingDropdown(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setOpenmenu(false);
      }
    };

    if (showSettingDropdown || openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettingDropdown, openMenu]);

  const isMainDomain =
    typeof window !== "undefined" &&
    (brand?.subdomain === "kavisha" ||
      window.location.hostname.replace(/^www\./, "").split(".").length === 2);

  const isBlocked = isInAppBrowser && isMobile;
  const isNavigating = loadingPath !== null;

  const handleSignIn = async (redirectPath) => {
    setSigningIn(true);
    setPopupBlockedHint(false);
    try {
      if (redirectPath && typeof window !== "undefined") {
        // Ensure redirectPath is a string and starts with /
        const path =
          typeof redirectPath === "string" && redirectPath.startsWith("/")
            ? redirectPath
            : "/";
        localStorage.setItem("redirectAfterLogin", path);
      }
      await signIn();
      refresh();
      // router.push("/");
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlockedHint(true);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleNavigate = (path, { closeMenu = false, closeSettings = false } = {}) => {
    setLoadingPath(path);
    if (closeMenu) setOpenmenu(false);
    if (closeSettings) setShowsettingDropdown(false);
    router.push(path);
  };

  const getNavLabel = (path, label) =>
    loadingPath === path ? "Opening..." : label;

  const settingOptions = [
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "/help" },
  ];

  const menuIconClass = "w-5 h-5 shrink-0 text-muted";
  const menuRowBtnClass =
    "w-full flex items-center gap-3 rounded-lg px-3 py-3.5 text-left text-foreground transition-colors hover:bg-muted-bg";

  return (
    <div className="relative">
      <nav className="hidden md:block w-full fixed top-0 left-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur">
        <div className="px-4 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            {brand?.logoUrl ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200/50">
                <img
                  src={brand.logoUrl}
                  alt={`${brand.brandName} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2D545E] text-lg font-bold text-white">
                {brand?.brandName?.[0]?.toUpperCase() || "K"}
              </div>
            )}
            <span className="font-baloo">
              {brand?.brandName?.toUpperCase() || "Kavisha"}
            </span>
          </div>

          <div className="flex items-center gap-4 font-baloo">
            {isMainDomain && (
              <button
                onClick={() => {
                  if (user) {
                    handleNavigate("/talk-to-avatar");
                  } else if (!isBlocked) {
                    handleSignIn("/talk-to-avatar");
                  }
                }}
                disabled={isBlocked || isNavigating}
                className={
                  isBlocked || isNavigating ? "opacity-60 cursor-not-allowed" : ""
                }
              >
                {getNavLabel("/talk-to-avatar", "TALK TO AVATAARS")}
              </button>
            )}
            {isMainDomain && (
              <button
                onClick={() => handleNavigate("/make-avatar")}
                disabled={isNavigating}
                className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
                // className="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {getNavLabel("/make-avatar", "MAKE MY AVATAAR")}
              </button>
            )}
            {user && (
              <>
                <button
                  onClick={() => handleNavigate("/chats")}
                  disabled={isNavigating}
                  className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {getNavLabel("/chats", "CHATS")}
                </button>
                <button
                  onClick={() => handleNavigate("/community")}
                  disabled={isNavigating}
                  className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
                >
                  {getNavLabel("/community", "COMMUNITY")}
                </button>
              </>
            )}
            {brand?.subdomain && (
              <button
                type="button"
                onClick={() =>
                  handleNavigate(`/links?brand=${encodeURIComponent(brand.subdomain)}`)
                }
                disabled={isNavigating}
                className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
              >
                {getNavLabel(
                  `/links?brand=${encodeURIComponent(brand.subdomain)}`,
                  "LINKS",
                )}
              </button>
            )}
            {brand?.enableProducts && (
              <button
                onClick={() => handleNavigate("/products")}
                disabled={isNavigating}
                className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
              >
                {getNavLabel("/products", "STORE")}
              </button>
            )}
            {brand?.enableJobs && (
              <button
                onClick={() => handleNavigate("/jobs")}
                disabled={isNavigating}
                className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
              >
                {getNavLabel("/jobs", "JOBS")}
              </button>
            )}
            {brand?.enableBlogs && (
              <button
                onClick={() =>
                  handleNavigate(
                    "/blogs" +
                      (brand?.subdomain
                        ? `?subdomain=${encodeURIComponent(brand.subdomain)}`
                        : ""),
                  )
                }
                disabled={isNavigating}
                className={isNavigating ? "opacity-60 cursor-not-allowed" : ""}
              >
                {getNavLabel(
                  "/blogs" +
                    (brand?.subdomain
                      ? `?subdomain=${encodeURIComponent(brand.subdomain)}`
                      : ""),
                  "BLOGS",
                )}
              </button>
            )}
            {loading ? (
              <div className=" text-sm text-muted">Loading...</div>
            ) : !user ? (
              <div className="flex flex-col items-end">
                {isBlocked ? (
                  <button
                    onClick={openInChrome}
                    className="font-baloo text-sm text-amber-600 hover:underline dark:text-amber-300"
                  >
                    Open in Chrome to sign in
                  </button>
                ) : (
                  <button
                    onClick={handleSignIn}
                    disabled={signingIn}
                    className=" font-baloo"
                  >
                    {signingIn ? "Signing in..." : "SIGN IN"}
                  </button>
                )}
                {popupBlockedHint && !isBlocked && (
                  <p className="mt-1 max-w-[200px] text-right text-xs text-amber-600 dark:text-amber-300">
                    Popup was blocked. Try again — it&apos;ll work.
                  </p>
                )}
              </div>
            ) : (
              <button onClick={signOut} className="font-baloo">
                SIGN OUT
              </button>
            )}
            <div className="relative" ref={settingDropdownRef}>
              <button onClick={() => setShowsettingDropdown((prev) => !prev)}>
                <Settings className="w-4 h-4 stroke-2" />
              </button>
              {showSettingDropdown && (
                <div className="absolute top-full right-0 mt-4 bg-card rounded-lg shadow-lg border border-border min-w-[180px] z-50">
                  {settingOptions.map((item, index) => {
                    return (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-bg first:rounded-t-lg last:rounded-b-lg transition-colors"
                        onClick={() => {
                          handleNavigate(item?.path, { closeSettings: true });
                        }}
                      >
                        {getNavLabel(item?.path, item?.name)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <nav className="md:hidden border-b border-border bg-background/95 py-2.5 px-4 text-foreground backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-baloo flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 pl-0 pr-2 text-left text-foreground transition-opacity hover:opacity-90 active:opacity-80"
            aria-label="Go to home"
          >
            {brand?.logoUrl ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200/50">
                <img
                  src={brand.logoUrl}
                  alt={`${brand?.brandName || "Brand"} logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D545E] text-base font-bold text-white">
                {brand?.brandName?.[0]?.toUpperCase() || "K"}
              </div>
            )}
            <span className="truncate text-base font-semibold uppercase tracking-wide">
              {brand?.brandName?.toUpperCase() || "Kavisha"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOpenmenu((prev) => !prev)}
            className="shrink-0 rounded-lg p-2 text-foreground transition-colors hover:bg-muted-bg"
            aria-expanded={openMenu}
            aria-controls="mobile-nav-menu"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>
      </nav>

      {openMenu && (
        <div
          id="mobile-nav-menu"
          className="fixed inset-0 z-[100] md:hidden flex flex-col bg-background text-foreground"
          style={{
            paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
            <span className="font-baloo text-lg font-semibold tracking-wide text-foreground">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpenmenu(false)}
              className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted-bg"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-0.5 font-baloo">
            <li>
              <button
                type="button"
                className={menuRowBtnClass}
                onClick={() => {
                  handleNavigate("/featured", { closeMenu: true });
                }}
                disabled={isNavigating}
              >
                <LayoutGrid className={menuIconClass} strokeWidth={2} />
                {getNavLabel("/featured", "Services")}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={menuRowBtnClass}
                onClick={() => {
                  handleNavigate("/help", { closeMenu: true });
                }}
                disabled={isNavigating}
              >
                <HelpCircle className={menuIconClass} strokeWidth={2} />
                {getNavLabel("/help", "Help")}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={menuRowBtnClass}
                onClick={() => {
                  handleNavigate("/privacy-policy", { closeMenu: true });
                }}
                disabled={isNavigating}
              >
                <Shield className={menuIconClass} strokeWidth={2} />
                {getNavLabel("/privacy-policy", "Privacy Policy")}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={menuRowBtnClass}
                onClick={() => {
                  handleNavigate("/tnc", { closeMenu: true });
                }}
                disabled={isNavigating}
              >
                <FileText className={menuIconClass} strokeWidth={2} />
                {getNavLabel("/tnc", "Terms and Conditions")}
              </button>
            </li>
            {brand?.subdomain === "kavisha" && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                    handleNavigate("/make-avatar", { closeMenu: true });
                  }}
                  disabled={isNavigating}
                >
                  <Sparkles className={menuIconClass} strokeWidth={2} />
                  {getNavLabel("/make-avatar", "Make my Avataar")}
                </button>
              </li>
            )}
            {brand?.subdomain === "kavisha" && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                    handleNavigate("/talk-to-avatar", { closeMenu: true });
                  }}
                  disabled={isNavigating}
                >
                  <MessageCircle className={menuIconClass} strokeWidth={2} />
                  {getNavLabel("/talk-to-avatar", "Talk to Avataars")}
                </button>
              </li>
            )}
            {user && (
              <>
                <li>
                  <button
                    type="button"
                    className={menuRowBtnClass}
                    onClick={() => {
                      handleNavigate("/chats", { closeMenu: true });
                    }}
                    disabled={isNavigating}
                  >
                    <MessagesSquare className={menuIconClass} strokeWidth={2} />
                    {getNavLabel("/chats", "Chats")}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={menuRowBtnClass}
                    onClick={() => {
                      handleNavigate("/community", { closeMenu: true });
                    }}
                    disabled={isNavigating}
                  >
                    <Users className={menuIconClass} strokeWidth={2} />
                    {getNavLabel("/community", "Community")}
                  </button>
                </li>
              </>
            )}
            {brand?.subdomain && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                  handleNavigate(
                    `/links?brand=${encodeURIComponent(brand.subdomain)}`,
                    { closeMenu: true },
                  );
                  }}
                disabled={isNavigating}
                >
                  <Link2 className={menuIconClass} strokeWidth={2} />
                {getNavLabel(
                  `/links?brand=${encodeURIComponent(brand.subdomain)}`,
                  "Links",
                )}
                </button>
              </li>
            )}
            {brand?.enableProducts && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                    handleNavigate("/products", { closeMenu: true });
                  }}
                  disabled={isNavigating}
                >
                  <ShoppingBag className={menuIconClass} strokeWidth={2} />
                  {getNavLabel("/products", "Store")}
                </button>
              </li>
            )}
            {brand?.enableJobs && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                    handleNavigate("/jobs", { closeMenu: true });
                  }}
                  disabled={isNavigating}
                >
                  <Briefcase className={menuIconClass} strokeWidth={2} />
                  {getNavLabel("/jobs", "Jobs")}
                </button>
              </li>
            )}
            {brand?.enableBlogs && (
              <li>
                <button
                  type="button"
                  className={menuRowBtnClass}
                  onClick={() => {
                    handleNavigate(
                      "/blogs" +
                        (brand?.subdomain
                          ? `?subdomain=${encodeURIComponent(brand.subdomain)}`
                          : ""),
                      { closeMenu: true },
                    );
                  }}
                  disabled={isNavigating}
                >
                  <BookOpen className={menuIconClass} strokeWidth={2} />
                  {getNavLabel(
                    "/blogs" +
                      (brand?.subdomain
                        ? `?subdomain=${encodeURIComponent(brand.subdomain)}`
                        : ""),
                    "Blogs",
                  )}
                </button>
              </li>
            )}
            <li className="mt-2 border-t border-border pt-2">
              {loading ? (
                <button
                  type="button"
                  disabled
                  className={`${menuRowBtnClass} cursor-not-allowed text-muted hover:bg-transparent`}
                >
                  <Loader2 className={`${menuIconClass} animate-spin`} strokeWidth={2} />
                  Loading...
                </button>
              ) : !user ? (
                <div className="px-0 py-0">
                  {isBlocked ? (
                    <button
                      type="button"
                      onClick={openInChrome}
                      className={menuRowBtnClass}
                    >
                      <Chrome className={menuIconClass} strokeWidth={2} />
                      Open in Chrome to sign in
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenmenu(false);
                        handleSignIn();
                      }}
                      disabled={signingIn}
                      className={menuRowBtnClass}
                    >
                      <LogIn className={menuIconClass} strokeWidth={2} />
                      {signingIn ? "Signing in..." : "Sign In"}
                    </button>
                  )}
                  {popupBlockedHint && !isBlocked && (
                    <p className="text-xs text-amber-600 mt-2 px-3">
                      Popup was blocked. Try again — it&apos;ll work.
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className={`${menuRowBtnClass} font-medium`}
                  onClick={() => {
                    setOpenmenu(false);
                    signOut();
                  }}
                >
                  <LogOut className={menuIconClass} strokeWidth={2} />
                  Sign Out
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
