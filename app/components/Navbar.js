"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { urlFor } from "../lib/sanity";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const brand = useBrandContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (pathname === "/make-avatar") {
      setIsNavigating(false);
    }
  }, [pathname]);

  const handleMakeAvatar = () => {
    setIsNavigating(true);
    router.push("/make-avatar");
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white fixed top-0 left-0 z-50">
      <div className="px-4 h-14 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push("/")}
        >
          {brand?.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={`${brand.brandName} logo`}
              className="w-12 h-12 rounded-md object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {brand?.brandName?.[0]?.toUpperCase() || "K"}
            </div>
          )}
          <span className="text-sm sm:text-base font-semibold text-gray-800">
            {brand?.brandName || "Kavisha"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={handleMakeAvatar}
              disabled={isNavigating}
              className="px-3 py-1.5 rounded-md text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </>
              ) : (
                "Make My AI Avatar"
              )}
            </button>
          )}
          {!session ? (
            <button
              onClick={() => {
                signIn("google", { callbackUrl: "/" });
              }}
              className="px-3 py-1.5 rounded-md text-sm bg-sky-900 text-white hover:bg-sky-700"
            >
              Sign in
            </button>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
