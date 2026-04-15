"use client";

import { useState, useLayoutEffect } from "react";
import { MoreVertical } from "lucide-react";
import AdminJobsSidebar from "./components/AdminJobsSidebar";

export default function AdminJobsLayout({ children }) {
  /** Closed on small viewports, open from md up — synced on resize (same as user /jobs layout). */
  const [navOpen, setNavOpen] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setNavOpen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground">
      <div className="relative flex min-h-screen w-full max-w-6xl">
        {navOpen ? (
          <>
            <div
              className="fixed inset-0 z-[55] bg-black/50 md:hidden"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            {/* Above AdminNavbar (z-50) so close control and full-height panel are visible */}
            <div className="fixed inset-y-0 left-0 z-[60] flex h-[100dvh] w-[280px] max-w-[85vw] flex-col bg-card shadow-xl md:static md:z-auto md:h-full md:min-h-screen md:w-56 md:max-w-none md:shadow-none">
              <AdminJobsSidebar onClose={() => setNavOpen(false)} />
            </div>
          </>
        ) : null}

        {!navOpen && (
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="fixed left-0 top-16 z-[65] flex h-10 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-background/95 text-muted shadow-sm transition-all hover:w-7 hover:bg-muted-bg hover:text-foreground"
            aria-label="Open admin jobs panel"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}

        <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
