"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ServicesSidebar from "./components/ServicesSidebar";

export default function AdminServicesLayout({ children }) {
  const brandContext = useBrandContext();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!brandContext?.enableBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="text-center max-w-md">
          <p className="mb-4 text-muted">
            Booking is disabled. Enable it from My Services → Feature Settings (Booking toggle).
          </p>
          <button
            type="button"
            onClick={() => router.push(`/admin/${brandContext?.subdomain || ""}/my-services`)}
            className="px-4 py-2 rounded-lg bg-[#2D545E] text-white hover:bg-[#264850] transition-colors"
          >
            Go to My Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground">
      <div className="w-full max-w-6xl flex min-h-screen">
        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] md:static md:z-auto md:w-56">
              <ServicesSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        ) : null}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-16 z-[60] rounded-r-lg border border-l-0 border-border bg-card p-2 shadow-sm hover:bg-muted-bg"
            aria-label="Open panel"
          >
            <PanelLeft className="w-5 h-5 text-muted" />
          </button>
        )}
        <main className="flex-1 min-w-0 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
