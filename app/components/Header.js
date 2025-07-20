import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Header() {
  const session = await getServerSession(authOptions);
  return (
    <header className="mb-2">
      <div className="font-bold text-6xl items-center">
        Kavisha.<span>ai</span>
      </div>
      <div className="text-sm text-slate-600">
        {session?.user?.profileType !== "recruiter"
          ? `I'm here to help you find the job you want. Let's talk!`
          : `I'm here to help you hire people! Let's talk!`}{" "}
        <span>😊</span>
      </div>
      {session?.user && (
        <div>
          {session.user.image && (
            <img
              src={session?.user?.image}
              alt="avatar"
              className="w-8 h-8 rounded-full border border-emerald-200"
            />
          )}
        </div>
      )}
    </header>
  );
}
