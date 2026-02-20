"use client";
import { useFirebaseSession } from "./lib/firebase/FirebaseSessionProvider";
import { useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import Loader from "./components/Loader";
import Homepage from "./components/Homepage";
import AvatarHomepage from "./components/AvatarHomepage";

export default function HomePage() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();

  // When redirected from protected route (e.g. /community), ?redirect= is set. Store it for after login.
  useEffect(() => {
    if (loading) return;
    const redirectParam = searchParams.get("redirect");
    const path = typeof redirectParam === "string" && redirectParam.startsWith("/") ? redirectParam : null;
    if (!path) return;

    if (user && brandContext) {
      localStorage.removeItem("redirectAfterLogin");
      router.replace(path);
      return;
    }
    // Not logged in: store for redirect after login, then clean URL
    if (typeof window !== "undefined") {
      localStorage.setItem("redirectAfterLogin", path);
    }
    router.replace("/", { scroll: false });
  }, [loading, user, brandContext, searchParams, router]);

  useLayoutEffect(() => {
    if (loading || !user || !brandContext) {
      return;
    }
    const redirectPath = typeof window !== "undefined" ? localStorage.getItem("redirectAfterLogin") : null;

    if (redirectPath) {
      const path = typeof redirectPath === "string" && redirectPath.startsWith("/")
        ? redirectPath
        : null;

      if (path) {
        localStorage.removeItem("redirectAfterLogin");
        router.replace(path);
        return;
      } else {
        localStorage.removeItem("redirectAfterLogin");
      }
    }
  }, [user, loading, brandContext, router]);

  useLayoutEffect(() => {
    if (user && brandContext?.isBrandAdmin) {
      router.push(`/admin/${brandContext.subdomain}/v2`);
    }
  }, [user, brandContext, router]);

  if (loading) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (brandContext?.isBrandAdmin) {
    return <Loader loadingMessage="Redirecting to admin dashboard..." />;
  }

  const displayName = (user?.name || user?.email?.split("@")[0] || "there").toUpperCase();

  return (
    <div className="min-h-screen">
      {user && (
        <div className="sm:pt-16 pt-4 pl-4">
          <p className="font-akshar text-[#3D5A5E] text-lg text-left uppercase">
            Welcome back, <span className="font-semibold">{displayName}</span>!
          </p>
        </div>
      )}
      {brandContext.subdomain === "kavisha" ? <Homepage /> : <AvatarHomepage />}
    </div>
  );
}
