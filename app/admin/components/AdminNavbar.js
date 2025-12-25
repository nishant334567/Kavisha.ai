"use client";
import { signIn } from "@/app/lib/firebase/sign-in";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { signOut } from "@/app/lib/firebase/logout";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { User, Settings, Menu } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
export default function AdminNavbar() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const brand = useBrandContext();
  const pathname = usePathname();
  const go = (path) => router.push(path);
  const [showNavoption, setShowNavoption] = useState(false);
  const [showSettingDropdown, setShowsettingDropdown] = useState(false);

  const settingOptions = [
    { name: "Sign Out", path: "" },
    { name: "Settings", path: "/settings" },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "" },
  ];
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-14 bg-gray-800 z-50">
        <div className="px-4 h-full flex items-center justify-between font-akshar text-sm">
          <div className="flex items-center gap-3">
            <div className="flex justify-between items-center">
              <img
                src="/avatar.png"
                alt="Avatar"
                className="w-6 h-6 rounded-full"
              />
            </div>
            <button
              onClick={() => go(`/admin/${brand?.subdomain}/v2`)}
              className="text-[#FFEED8] uppercase tracking-wide hover:opacity-80 transition-opacity"
            >
              Home
            </button>
          </div>
          <button onClick={() => setShowNavoption(true)}>
            <Menu className="w-5 h-5 text-[#FFEED8] sm:hidden" />
          </button>
          <ul className="items-center gap-6 hidden sm:flex">
            <li
              className={`cursor-pointer text-[#FFEED8] uppercase tracking-wide ${
                pathname?.includes("/my-services") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/my-services`)}
            >
              MY SERVICES
            </li>
            <li
              className={`cursor-pointer text-[#FFEED8] uppercase tracking-wide ${
                pathname?.includes("/train") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/train/v2`)}
            >
              TRAIN MY AVATAAR
            </li>
            <li
              className={`cursor-pointer text-[#FFEED8] uppercase tracking-wide flex items-center gap-2 ${
                pathname?.includes("/edit-profile") ? "font-semibold" : ""
              }`}
              onClick={() => go(`/admin/${brand?.subdomain}/edit-profile`)}
            >
              MY PROFILE
            </li>
            <li className="relative">
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
              )}
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
