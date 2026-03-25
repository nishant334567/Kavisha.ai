"use client";

import { useState } from "react";
import ProductsSidebar from "./components/ProductsSidebar";
import { PanelLeft } from "lucide-react";

export default function ProductsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground">
      <div className="w-full max-w-6xl flex min-h-screen relative">
        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] md:static md:z-auto md:w-56">
              <ProductsSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        ) : null}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-16 z-[60] rounded-r-lg border border-border border-l-0 bg-card p-2 shadow-sm hover:bg-muted-bg"
            aria-label="Open panel"
          >
            <PanelLeft className="h-5 w-5 text-muted" />
          </button>
        )}
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

