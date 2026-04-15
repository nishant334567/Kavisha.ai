"use client";

import { useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import UserJobsSidebar from "./components/UserJobsSidebar";

export default function JobsLayout({ children }) {
  const brandContext = useBrandContext();
  const router = useRouter();
  /** Closed on small viewports, open from md up — synced on resize. */
  const [navOpen, setNavOpen] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setNavOpen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!brandContext?.enableJobs) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="max-w-md text-center">
          <p className="mb-4 text-muted">Jobs are not enabled for this brand.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-lg bg-[#2D545E] px-4 py-2 text-white transition-colors hover:bg-[#264850]"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground">
      <div className="relative flex min-h-screen w-full max-w-6xl">
        {navOpen ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] shrink-0 md:static md:z-auto md:block md:w-56 md:max-w-none">
              <UserJobsSidebar onClose={() => setNavOpen(false)} />
            </div>
          </>
        ) : null}

        {!navOpen && (
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="fixed left-0 top-16 z-[60] flex h-10 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-background/95 text-muted shadow-sm transition-all hover:w-7 hover:bg-muted-bg hover:text-foreground"
            aria-label="Open jobs panel"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
