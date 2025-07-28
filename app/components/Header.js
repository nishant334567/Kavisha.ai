"use client";
import React from "react";
import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-xs sm:max-w-md mx-auto text-center">
        {/* Main Title - Responsive */}
        <div className="font-bold text-4xl sm:text-5xl md:text-6xl text-slate-700 mb-2">
          Kavisha.<span>ai</span>
        </div>

        {/* Subtitle with emoji */}
        <div className="text-slate-500 text-sm sm:text-base px-2 sm:px-0">
          {session?.user?.profileType !== "recruiter"
            ? `I'm here to help you find the job you want. Let's talk!`
            : `I'm here to help you hire people! Let's talk!`}{" "}
          <span className="text-base sm:text-lg">😊</span>
        </div>

        {/* User Avatar */}
        {session?.user && session.user.image && (
          <div className="flex justify-center mt-4">
            <img
              src={session.user.image}
              alt="avatar"
              className="w-8 h-8 rounded-full border border-emerald-200"
            />
          </div>
        )}
      </div>
    </header>
  );
}
