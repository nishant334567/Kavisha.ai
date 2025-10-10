"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { urlFor } from "../lib/sanity";

export default function Navbar() {
  const { data: session } = useSession();
  const brand = useBrandContext();

  return (
    <nav className="w-full border-b border-gray-200 bg-white fixed top-0 left-0 z-50">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
