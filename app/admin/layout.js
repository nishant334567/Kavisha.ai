"use client";

import { usePathname } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { signOut } from "@/app/lib/firebase/logout";
import Loader from "@/app/components/Loader";
import { isAdminBrandWelcomePath } from "@/app/utils/subdomain";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { user, loading } = useFirebaseSession();
  const brandContext = useBrandContext();
  const router = useRouter();
  const onWelcome = isAdminBrandWelcomePath(pathname);

  useEffect(() => {
    if (onWelcome || loading || !brandContext) return;
    if (!user) {
      router.replace("/");
    }
  }, [onWelcome, loading, user, brandContext, router]);

  if (loading || !brandContext) {
    return <Loader loadingMessage="Loading..." />;
  }

  if (onWelcome) {
    return (
      <div className="font-baloo min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  if (!user) {
    return <Loader loadingMessage="Redirecting..." />;
  }

  if (!brandContext.isBrandAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg text-center">
          <p className="font-medium text-foreground">
            You are not an admin for this avatar.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full rounded-xl bg-highlight px-4 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Go home
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted-bg"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-baloo min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
