"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function Header() {
  const { data: session } = useSession();
  const brandContext = useBrandContext();
  const headerShell = (
    <header className="px-4 py-2 text-center">
      <div className="max-w-md mx-auto">
        <div className="h-6" />
        <div className="h-5" />
        <div className="h-4" />
      </div>
    </header>
  );

  if (!brandContext) {
    return headerShell;
  }

  const { brandName, description } = brandContext;

  return (
    <header className="px-4 py-2 text-center">
      <div className="max-w-md mx-auto">
        {/* Brand Name */}
        <h1 className="text-3xl font-bold text-slate-700 mb-2">{brandName}</h1>

        {/* User Greeting with Welcome */}
        {session?.user && (
          <p className="text-lg text-slate-600 mb-3">
            Hi {session.user.name}, welcome to {brandName}
          </p>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-500 mb-4">{description}</p>
        )}
      </div>
    </header>
  );
}
