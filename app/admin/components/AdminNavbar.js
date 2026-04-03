"use client";
import { signIn } from "@/app/lib/firebase/sign-in";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { signOut } from "@/app/lib/firebase/logout";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Settings, Menu, X, MessageCircleMore } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
export default function AdminNavbar() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const brand = useBrandContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showNavoption, setShowNavoption] = useState(false);
  const [showSettingDropdown, setShowsettingDropdown] = useState(false);
  const [loadingPath, setLoadingPath] = useState(null);

  const settingDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingDropdownRef.current && !settingDropdownRef.current.contains(event.target)) {
        setShowsettingDropdown(false);
      }
    };

    if (showSettingDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettingDropdown]);

  const searchKey = searchParams.toString();
  useEffect(() => {
    setLoadingPath(null);
  }, [pathname, searchKey]);

  const settingOptions = [
    { name: "Sign Out", path: "" },
    { name: "Add Admin", path: `/admin/${brand?.subdomain}/add-admin` },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "/help" },
  ];

  const navOptions = [
    { name: "Home", path: `/admin/${brand?.subdomain}/v2` },
    { name: "My Services", path: `/admin/${brand?.subdomain}/my-services` },
    { name: "Train My Avataar", path: `/admin/${brand?.subdomain}/train/v2` },
    { name: "Revenue", path: `/admin/${brand?.subdomain}/revenue` },
    { name: "My Profile", path: `/admin/${brand?.subdomain}/edit-profile` },
  ];

  const handleNavigate = (path, { closeMenu = false, closeSettings = false } = {}) => {
    if (typeof window !== "undefined") {
      const here = window.location.pathname + window.location.search;
      if (here === path) {
        if (closeMenu) setShowNavoption(false);
        if (closeSettings) setShowsettingDropdown(false);
        return;
      }
    }
    setLoadingPath(path);
    if (closeMenu) setShowNavoption(false);
    if (closeSettings) setShowsettingDropdown(false);
    router.push(path);
  };

  const getNavLabel = (path, label) =>
    loadingPath === path ? "Opening..." : label;
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 w-full border-b border-border bg-card text-muted">
        <div className="hidden px-4 h-full md:flex items-center justify-between font-baloo text-sm">
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/v2`)}
              className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-80"
            >
              {brand?.logoUrl ? (
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted-bg ring-1 ring-border">
                  <img
                    src={brand.logoUrl}
                    alt={`${brand?.brandName || "Brand"} logo`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D545E] text-sm font-bold text-white">
                  {brand?.brandName?.[0]?.toUpperCase() || "K"}
                </div>
              )}
              <span className="text-foreground uppercase tracking-wide">
                {getNavLabel(`/admin/${brand?.subdomain}/v2`, "Home")}
              </span>
            </button>
          </div>
          <button onClick={() => setShowNavoption(true)} className="md:hidden">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <ul className="items-center gap-6 hidden md:flex">
            <li
              className={`cursor-pointer uppercase tracking-wide text-muted hover:text-foreground transition-colors ${pathname?.includes("/my-services") ? "font-semibold text-foreground" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/my-services`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/my-services`, "MY SERVICES")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-muted hover:text-foreground transition-colors ${pathname?.includes("/train") ? "font-semibold text-foreground" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/train/v2`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/train/v2`, "TRAIN MY AVATAAR")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-muted hover:text-foreground transition-colors ${pathname?.includes("/revenue") ? "font-semibold text-foreground" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/revenue`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/revenue`, "REVENUE")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide flex items-center gap-2 text-muted hover:text-foreground transition-colors ${pathname?.includes("/edit-profile") ? "font-semibold text-foreground" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/edit-profile`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/edit-profile`, "MY PROFILE")}
            </li>
            <li className="relative" ref={settingDropdownRef}>
              <button onClick={() => setShowsettingDropdown((prev) => !prev)} className="text-muted transition-colors hover:text-foreground">
                <Settings className="w-4 h-4 stroke-2" />
              </button>
              {showSettingDropdown && (
                <div className="absolute top-full right-0 z-50 mt-4 min-w-[180px] rounded-lg border border-border bg-card shadow-lg">
                  {settingOptions.map((item, index) => {
                    return (
                      <button
                        key={index}
                        className="w-full px-4 py-2 text-left text-sm text-foreground transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted-bg"
                        onClick={() => {
                          if (item?.name === "Sign Out") {
                            signOut();
                          } else if (item?.path) {
                            handleNavigate(item?.path, { closeSettings: true });
                          }
                        }}
                      >
                        {item?.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          </ul>
        </div>
        <div className="flex justify-between border-b border-border bg-card px-3 py-4 md:hidden">
          <div
            onClick={() => setShowNavoption((prev) => !prev)}
            className="text-foreground"
          >
            <Menu className="w-5 h-5" />
          </div>
          {/* <div className="flex items-center gap-2">
            <button>
              <MessageCircleMore />
            </button>
            <button>
              <Settings />
            </button>
          </div> */}
        </div>
        {showNavoption && (
          <div className="z-50 w-full border-t border-border bg-card shadow-lg md:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-baloo text-lg font-semibold text-foreground">
                Menu
              </h3>
              <button
                onClick={() => setShowNavoption(false)}
                className="text-muted transition-colors hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col">
              {navOptions.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setShowNavoption(false);
                    handleNavigate(item.path, { closeMenu: true });
                  }}
                  className={`w-full border-b border-border px-4 py-3 text-left font-baloo text-sm uppercase tracking-wide transition-colors ${pathname === item.path
                    ? "bg-muted-bg text-foreground font-semibold"
                    : "text-muted hover:bg-muted-bg hover:text-foreground"
                    }`}
                >
                  {getNavLabel(item.path, item.name)}
                </button>
              ))}
              {settingOptions.map((item, index) => {
                return (
                  <button
                    key={index}
                    className="w-full border-b border-border px-4 py-3 text-left font-baloo text-sm uppercase tracking-wide text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                    onClick={() => {
                      setShowsettingDropdown(false);
                      if (item?.name === "Sign Out") {
                        signOut();
                      } else if (item?.path) {
                        router.push(item?.path);
                      }
                    }}
                  >
                    {item?.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
