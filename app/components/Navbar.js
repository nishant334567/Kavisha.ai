"use client";
import { useState } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { signIn } from "../lib/firebase/sign-in";
import { signOut } from "../lib/firebase/logout";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, loading, refresh } = useFirebaseSession();
  const brand = useBrandContext();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

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
          {isMainDomain && (
            <button
              onClick={() => {
                if (user) {
                  router.push("/make-avatar/v2");
                } else {
                  handleSignIn();
                }
              }}
              className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Make my AI avatar
            </button>
          )}
          {loading ? (
            <div className="px-3 py-1.5 text-sm text-gray-500">Loading...</div>
          ) : !user ? (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="px-3 py-1.5 rounded-md text-sm bg-sky-900 text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {signingIn ? "Signing in..." : "Sign in"}
            </button>
          ) : (
            <button
              onClick={signOut}
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
