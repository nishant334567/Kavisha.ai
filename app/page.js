"use client";
import { useFirebaseSession } from "./lib/firebase/FirebaseSessionProvider";
import { useEffect, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "./context/brand/BrandContextProvider";
import Loader from "./components/Loader";
import Homepage from "./components/Homepage";
import AvatarHomepage from "./components/AvatarHomepage";
import { isAdminBrandWelcomePath } from "./utils/subdomain";

function allowRedirectWithoutAdmin(path) {
  return isAdminBrandWelcomePath(path);
}

export default function HomePage() {
  const { user, loading } = useFirebaseSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();

  // When redirected from protected route (e.g. /community), ?redirect= is set. Store it for after login.
  useEffect(() => {
    if (loading) return;
    const redirectParam = searchParams.get("redirect");
    const path =
      typeof redirectParam === "string" && redirectParam.startsWith("/")
        ? redirectParam
        : null;
    if (!path) return;

    if (user && brandContext) {
      localStorage.removeItem("redirectAfterLogin");
      // Don't send non-admins to admin routes
      if (
        path.startsWith("/admin") &&
        !brandContext.isBrandAdmin &&
        !allowRedirectWithoutAdmin(path)
      ) {
        if (typeof window !== "undefined") localStorage.removeItem("redirectAfterLogin");
        router.replace("/", { scroll: false });
        return;
      }
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
    const redirectPath =
      typeof window !== "undefined"
        ? localStorage.getItem("redirectAfterLogin")
        : null;

    if (redirectPath) {
      const path =
        typeof redirectPath === "string" && redirectPath.startsWith("/")
          ? redirectPath
          : null;

      if (
        path &&
        !(
          path.startsWith("/admin") &&
          !brandContext?.isBrandAdmin &&
          !allowRedirectWithoutAdmin(path)
        )
      ) {
        localStorage.removeItem("redirectAfterLogin");
        router.replace(path);
        return;
      }
      localStorage.removeItem("redirectAfterLogin");
    }
  }, [user, loading, brandContext, router]);

  useLayoutEffect(() => {
    if (loading || !user || !brandContext?.isBrandAdmin) return;
    const hasRedirect =
      typeof window !== "undefined" &&
      localStorage.getItem("redirectAfterLogin");
    if (hasRedirect) return;
    const adminHome =
      brandContext.subdomain === "kavisha"
        ? "/admin"
        : `/admin/${brandContext.subdomain}/v2`;
    router.push(adminHome);
  }, [user, loading, brandContext, router]);

  if (loading) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (!brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (brandContext?.isBrandAdmin) {
    return <Loader loadingMessage="Redirecting to admin dashboard..." />;
  }

  const displayName = user?.name || "there";

  return (
    <div className="flex min-h-screen flex-col">
      {brandContext.subdomain === "kavisha" ? (
        <Homepage />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col max-lg:justify-center lg:justify-start">
          {user && (
            <div className="mx-auto w-full max-w-6xl shrink-0 px-4 pb-2 pt-3 md:px-6 md:pt-12">
              <p className="font-baloo text-left text-base text-[#3D5A5E] dark:text-muted">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-[#008282] to-[#17638C] bg-clip-text font-medium text-transparent">
                  {displayName}!
                </span>
              </p>
            </div>
          )}
          <AvatarHomepage />
        </div>
      )}
    </div>
  );
}
