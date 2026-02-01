"use client";
import { useState, useEffect, useRef } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { signOut } from "../lib/firebase/logout";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { Cross, Menu, X, Settings } from "lucide-react";

export default function Navbar() {
  const { user, loading, refresh } = useFirebaseSession();
  const brand = useBrandContext();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [popupBlockedHint, setPopupBlockedHint] = useState(false);
  const [openMenu, setOpenmenu] = useState(false);
  const [showSettingDropdown, setShowsettingDropdown] = useState(false);
  const settingDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingDropdownRef.current && !settingDropdownRef.current.contains(event.target)) {
        setShowsettingDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
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

  const handleSignIn = async (redirectPath) => {
    setSigningIn(true);
    setPopupBlockedHint(false);
    try {
      if (redirectPath && typeof window !== "undefined") {
        // Ensure redirectPath is a string and starts with /
        const path = typeof redirectPath === "string" && redirectPath.startsWith("/")
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

  const settingOptions = [
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "/help" },
  ];
  return (
    <div className="relative">
      <nav className="hidden md:block w-full bg-[#3D5E6B] fixed top-0 left-0 z-50 text-[#FFEED8]">
        <div className="px-4 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            {brand?.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={`${brand.brandName} logo`}
                className="w-14 h-14 object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {brand?.brandName?.[0]?.toUpperCase() || "K"}
              </div>
            )}
            <span className="font-akshar">
              {brand?.brandName?.toUpperCase() || "Kavisha"}
            </span>
          </div>

          <div className="flex items-center gap-4 font-akshar">
            {isMainDomain && (
              <button
                onClick={() => {
                  if (user) {
                    router.push("/talk-to-avatar");
                  } else {
                    handleSignIn("/talk-to-avatar");
                  }
                }}
              // className="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                TALK TO AVATAARS
              </button>
            )}
            {isMainDomain && (
              <button
                onClick={() => {
                  if (user) {
                    router.push("/make-avatar/v2");
                  } else {
                    handleSignIn("/make-avatar/v2");
                  }
                }}
              // className="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                MAKE MY AVATAAR
              </button>
            )}
            {loading ? (
              <div className=" text-sm text-muted">Loading...</div>
            ) : !user ? (
              <div className="flex flex-col items-end">
                <button
                  onClick={handleSignIn}
                  disabled={signingIn}
                  className=" font-akshar"
                >
                  {signingIn ? "Signing in..." : "SIGN IN"}
                </button>
                {popupBlockedHint && (
                  <p className="text-xs text-amber-200 mt-1 text-right max-w-[200px]">Popup was blocked. Try again — it&apos;ll work.</p>
                )}
              </div>
            ) : (
              <button onClick={signOut} className="font-akshar">
                SIGN OUT
              </button>
            )}
            <div className="relative" ref={settingDropdownRef}>
              <button onClick={() => setShowsettingDropdown((prev) => !prev)}>
                <Settings className="w-4 h-4 text-[#FFEED8] stroke-2" />
              </button>
              {showSettingDropdown && (
                <div className="absolute top-full right-0 mt-4 bg-card rounded-lg shadow-lg border border-border min-w-[180px] z-50">
                  {settingOptions.map((item, index) => {
                    return (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted-bg first:rounded-t-lg last:rounded-b-lg transition-colors"
                        onClick={() => {
                          setShowsettingDropdown(false);
                          router.push(item?.path);
                        }}
                      >
                        {item?.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <nav className="md:hidden bg-background border border-b-2 border-border py-4 px-4">
        <div className="flex gap-2 items-center">
          <button onClick={() => setOpenmenu((prev) => !prev)}>
            <Menu />
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-akshar text-left hover:opacity-80"
          >
            HOME
          </button>
        </div>
      </nav>

      {openMenu && (
        <div className="w-50% z-50 absolute left-0 top-14 py-2 px-8 bg-muted-bg rounded-md" ref={mobileMenuRef}>
          <ul className="space-y-4 font-akshar">
            <li>
              <button onClick={() => { setOpenmenu(false); router.push("/help"); }}>Help</button>
            </li>
            <li>
              <button onClick={() => { setOpenmenu(false); router.push("/privacy-policy"); }}>Privacy Policy</button>
            </li>
            <li>
              <button onClick={() => { setOpenmenu(false); router.push("/tnc"); }}>Terms and Conditions</button>
            </li>
            {brand?.subdomain === "kavisha" && (
              <li>
                <button onClick={() => {
                  setOpenmenu(false);
                  if (user) {
                    router.push("/make-avatar/v2");
                  } else {
                    handleSignIn("/make-avatar/v2");
                  }
                }}>Make my Avataar</button>
              </li>
            )}
            {brand?.subdomain === "kavisha" && (
              <li>
                <button onClick={() => { setOpenmenu(false); router.push("/talk-to-avatar"); }}>Talk to Avataars</button>
              </li>
            )}
            <li>
              {loading ? (
                <button disabled>Loading...</button>
              ) : !user ? (
                <div>
                  <button onClick={handleSignIn} disabled={signingIn}>
                    {signingIn ? "Signing in..." : "Sign In"}
                  </button>
                  {popupBlockedHint && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Popup was blocked. Try again — it&apos;ll work.</p>
                  )}
                </div>
              ) : (
                <button onClick={signOut}>Sign Out</button>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
