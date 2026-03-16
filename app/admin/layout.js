"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { signOut } from "@/app/lib/firebase/logout";
import Loader from "@/app/components/Loader";

const REDIRECT_SECONDS = 5;

export default function AdminLayout({ children }) {
  const { user, loading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (loading || !brandContext) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (brandContext.isBrandAdmin) return;
    // Non-admin: countdown runs in the card UI below
  }, [loading, user, brandContext, router]);

  // Countdown for non-admin (only update state in interval; redirect in next effect)
  useEffect(() => {
    if (loading || !brandContext || !user || brandContext.isBrandAdmin) return;
    const t = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [loading, user, brandContext?.isBrandAdmin]);

  // Redirect when countdown hits 0 and user is non-admin (do not call router inside setState)
  useEffect(() => {
    if (brandContext?.isBrandAdmin || !user || countdown > 0) return;
    router.replace("/");
  }, [countdown, brandContext?.isBrandAdmin, user, router]);

  if (loading || !brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!user) {
    return <Loader loadingMessage="Redirecting to homepage..." />;
  }

  if (!brandContext.isBrandAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <p className="text-center text-gray-800 font-medium">
            You are not an admin. Try logging in with an admin account.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full rounded-xl bg-[#2D545E] px-4 py-3 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Go to homepage
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
          <p className="mt-5 text-center text-sm text-gray-500">
            Redirecting to homepage in {countdown} sec...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
