"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import UserServicesSidebar from "./components/UserServicesSidebar";

export default function ServicesLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const brandContext = useBrandContext();
  const router = useRouter();

  if (!brandContext?.enableBooking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">Booking and services are not enabled for this brand.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-[#2D545E] text-white hover:bg-[#264850] transition-colors"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen relative">
        {sidebarOpen ? (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] md:static md:z-auto md:w-56">
              <UserServicesSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-16 z-40 md:hidden p-2 rounded-r-lg bg-white border border-l-0 border-gray-200 shadow-sm hover:bg-gray-50"
            aria-label="Open panel"
          >
            <PanelLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-4 z-40 hidden md:block p-2 rounded-r-lg bg-white border border-l-0 border-gray-200 shadow-sm hover:bg-gray-50"
            aria-label="Open panel"
          >
            <PanelLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
