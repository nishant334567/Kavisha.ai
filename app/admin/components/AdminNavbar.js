"use client";
import { signIn } from "@/app/lib/firebase/sign-in";
import { useFirebaseSession } from "../../lib/firebase/FirebaseSessionProvider";
import { signOut } from "@/app/lib/firebase/logout";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { User, Settings, Menu, X, MessageCircleMore } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
export default function AdminNavbar() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const brand = useBrandContext();
  const pathname = usePathname();
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

  const settingOptions = [
    { name: "Sign Out", path: "" },
    { name: "Add Admin", path: `/admin/${brand?.subdomain}/add-admin` },
    { name: "Privacy Policy", path: "/privacy-policy" },
    { name: "Terms and conditions", path: "/tnc" },
    { name: "Help", path: "/help" },
  ];

  const navOptions = [
    { name: "Home", path: `/admin/${brand?.subdomain}/v2` },
    {
      name: "Chat Requests",
      path: `/admin/${brand?.subdomain}/chat-requests`,
    },
    {
      name: "Community",
      path: `/admin/${brand?.subdomain}/my-community`,
    },
    { name: "My Services", path: `/admin/${brand?.subdomain}/my-services` },
    ...(brand?.enableBooking ? [{ name: "Booking Services", path: `/admin/services?subdomain=${encodeURIComponent(brand?.subdomain || "")}` }] : []),
    ...(brand?.enableQuiz ? [{ name: "Quizzes/Survey", path: `/admin/quiz` }] : []),
    ...(brand?.enableProducts ? [{ name: "Store", path: `/admin/products?subdomain=${encodeURIComponent(brand?.subdomain || "")}` }] : []),
    ...(brand?.enableJobs ? [{ name: "My Jobs", path: `/admin/jobs?subdomain=${encodeURIComponent(brand?.subdomain || "")}` }] : []),
    ...(brand?.enableBlogs ? [{ name: "Blogs", path: `/admin/blogs?subdomain=${encodeURIComponent(brand?.subdomain || "")}` }] : []),
    { name: "Links", path: `/admin/links?subdomain=${encodeURIComponent(brand?.subdomain || "")}` },
    { name: "Train My Avataar", path: `/admin/${brand?.subdomain}/train/v2` },
    { name: "Revenue", path: `/admin/${brand?.subdomain}/revenue` },
    { name: "My Profile", path: `/admin/${brand?.subdomain}/edit-profile` },
  ];

  const handleNavigate = (path, { closeMenu = false, closeSettings = false } = {}) => {
    setLoadingPath(path);
    if (closeMenu) setShowNavoption(false);
    if (closeSettings) setShowsettingDropdown(false);
    router.push(path);
  };

  const getNavLabel = (path, label) =>
    loadingPath === path ? "Opening..." : label;
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full h-14 bg-white border-b border-gray-200 z-50 text-gray-700">
        <div className="hidden px-4 h-full md:flex items-center justify-between font-akshar text-sm">
          <div className="hidden md:flex items-center gap-3">
            <div className="flex justify-between items-center">
              <img
                src="/avatar.png"
                alt="Avatar"
                className="w-6 h-6 rounded-full"
              />
            </div>
            <button
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/v2`)}
              className="uppercase tracking-wide hover:opacity-80 transition-opacity text-gray-700"
            >
              {getNavLabel(`/admin/${brand?.subdomain}/v2`, "Home")}
            </button>
          </div>
          <button onClick={() => setShowNavoption(true)} className="md:hidden">
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <ul className="items-center gap-6 hidden md:flex">
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/chat-requests") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/chat-requests`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/chat-requests`, "CHAT REQUESTS")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/my-community") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/my-community`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/my-community`, "COMMUNITY")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/my-services") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/my-services`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/my-services`, "MY SERVICES")}
            </li>
            {brand?.enableBooking && (
              <li
                className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/admin/services") ? "font-semibold text-gray-900" : ""
                  }`}
                onClick={() => handleNavigate(`/admin/services?subdomain=${encodeURIComponent(brand?.subdomain || "")}`)}
              >
                {getNavLabel(`/admin/services?subdomain=${encodeURIComponent(brand?.subdomain || "")}`, "BOOKING SERVICES")}
              </li>
            )}
            {brand?.enableQuiz && (
              <li
                className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname === "/admin/quiz" || pathname?.startsWith("/admin/quiz/") ? "font-semibold text-gray-900" : ""
                  }`}
                onClick={() => handleNavigate(`/admin/quiz`)}
              >
                {getNavLabel(`/admin/quiz`, "QUIZZES/SURVEY")}
              </li>
            )}
            {brand?.enableProducts && (
              <li
                className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/admin/products") ? "font-semibold text-gray-900" : ""
                  }`}
                onClick={() => handleNavigate(`/admin/products?subdomain=${encodeURIComponent(brand?.subdomain || "")}`)}
              >
                {getNavLabel(`/admin/products?subdomain=${encodeURIComponent(brand?.subdomain || "")}`, "STORE")}
              </li>
            )}
            {brand?.enableJobs && (
              <li
                className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/jobs") ? "font-semibold text-gray-900" : ""
                  }`}
                onClick={() => handleNavigate(`/admin/jobs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`)}
              >
                {getNavLabel(`/admin/jobs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`, "MY JOBS")}
              </li>
            )}
            {brand?.enableBlogs && (
              <li
                className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/blogs") ? "font-semibold text-gray-900" : ""
                  }`}
                onClick={() => handleNavigate(`/admin/blogs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`)}
              >
                {getNavLabel(`/admin/blogs?subdomain=${encodeURIComponent(brand?.subdomain || "")}`, "BLOGS")}
              </li>
            )}
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/admin/links") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/links?subdomain=${encodeURIComponent(brand?.subdomain || "")}`)}
            >
              {getNavLabel(`/admin/links?subdomain=${encodeURIComponent(brand?.subdomain || "")}`, "LINKS")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/train") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/train/v2`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/train/v2`, "TRAIN MY AVATAAR")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/revenue") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/revenue`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/revenue`, "REVENUE")}
            </li>
            <li
              className={`cursor-pointer uppercase tracking-wide flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors ${pathname?.includes("/edit-profile") ? "font-semibold text-gray-900" : ""
                }`}
              onClick={() => handleNavigate(`/admin/${brand?.subdomain}/edit-profile`)}
            >
              {getNavLabel(`/admin/${brand?.subdomain}/edit-profile`, "MY PROFILE")}
            </li>
            <li className="relative" ref={settingDropdownRef}>
              <button onClick={() => setShowsettingDropdown((prev) => !prev)} className="text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="w-4 h-4 stroke-2" />
              </button>
              {showSettingDropdown && (
                <div className="absolute top-full right-0 mt-4 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] z-50">
                  {settingOptions.map((item, index) => {
                    return (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors"
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
        <div className="flex justify-between md:hidden px-3 py-4 border-b border-gray-200 bg-white">
          <div
            onClick={() => setShowNavoption((prev) => !prev)}
            className="text-gray-700"
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
          <div className="md:hidden z-50 w-full bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
              <h3 className="font-akshar text-lg font-semibold text-gray-900">
                Menu
              </h3>
              <button
                onClick={() => setShowNavoption(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  className={`w-full text-left px-4 py-3 font-akshar text-sm uppercase tracking-wide transition-colors border-b border-gray-100 ${pathname === item.path
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {getNavLabel(item.path, item.name)}
                </button>
              ))}
              {settingOptions.map((item, index) => {
                return (
                  <button
                    key={index}
                    className="w-full text-left px-4 py-3 font-akshar text-sm uppercase tracking-wide transition-colors border-b border-gray-100 "
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
