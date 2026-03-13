"use client";

import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ServicesSidebar from "./components/ServicesSidebar";

export default function AdminServicesLayout({ children }) {
  const brandContext = useBrandContext();
  const router = useRouter();

  if (!brandContext?.enableBooking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 mb-4">
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
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen">
        <ServicesSidebar />
        <main className="flex-1 min-w-0 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
