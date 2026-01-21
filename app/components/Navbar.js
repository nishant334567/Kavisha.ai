"use client";
import { useState } from "react";
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
  const [openMenu, setOpenmenu] = useState(false);
  const [showSettingDropdown, setShowsettingDropdown] = useState(false);

  const isMainDomain =
    typeof window !== "undefined" &&
    (brand?.subdomain === "kavisha" ||
      window.location.hostname.replace(/^www\./, "").split(".").length === 2);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
      refresh();
      router.push("/");
    } catch (e) {
    } finally {
      setSigningIn(false);
    }
  };

  const settingOptions = [
    { name: "Settings", path: "/settings" },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "" },
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
                    router.push("/");
                  } else {
                    handleSignIn();
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
                    handleSignIn();
                  }
                }}
                // className="px-3 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                MAKE MY AVATAAR
              </button>
            )}
            {loading ? (
              <div className=" text-sm text-gray-500">Loading...</div>
            ) : !user ? (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className=" font-akshar"
              >
                {signingIn ? "Signing in..." : "SIGN IN"}
              </button>
            ) : (
              <button onClick={signOut} className="font-akshar">
                SIGN OUT
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowsettingDropdown((prev) => !prev)}>
                <Settings className="w-4 h-4 text-[#FFEED8] stroke-2" />
              </button>
              {showSettingDropdown && (
                <div className="absolute top-full right-0 mt-4 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] z-50">
                  {settingOptions.map((item, index) => {
                    return (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors"
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

      <nav className="md:hidden bg-white border border-b-2 border-gray-200 py-4 px-4">
        <div className="flex gap-2">
          <button onClick={() => setOpenmenu((prev) => !prev)}>
            <Menu />
          </button>
          <p>HOME</p>
        </div>
      </nav>

      {openMenu && (
        <div className="w-50% z-50 absolute left-0 top-14 py-2 px-8 bg-gray-50 rounded-md">
          <ul className="space-y-4 font-akshar">
            <li>
              <button>Help</button>
            </li>
            <li>
              <button>Settings</button>
            </li>
            <li>
              <button>Privacy Policy</button>
            </li>
            <li>
              <button>Terms and Conditions</button>
            </li>
            {brand?.subdomain === "kavisha" && (
              <li>
                <button>Make my Avataar</button>
              </li>
            )}
            {brand?.subdomain === "kavisha" && (
              <li>
                <button>Talk to Avataars</button>
              </li>
            )}
            <li>
              {loading ? (
                <button disabled>Loading...</button>
              ) : !user ? (
                <button onClick={handleSignIn} disabled={signingIn}>
                  {signingIn ? "Signing in..." : "Sign In"}
                </button>
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
