"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import UserProductsSidebar from "./components/UserProductsSidebar";

export default function ProductsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen relative">
        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] md:static md:z-auto md:w-56">
              <UserProductsSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        ) : null}

        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-16 z-[60] flex h-10 w-6 items-center justify-center rounded-r-md border border-l-0 border-border bg-background/95 text-muted shadow-sm transition-all hover:w-7 hover:bg-muted-bg hover:text-foreground md:top-14"
            aria-label="Open panel"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}

        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
