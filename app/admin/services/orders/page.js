"use client";

import ServicesSidebar from "../components/ServicesSidebar";
import { CalendarDays } from "lucide-react";

export default function ServiceOrdersPage() {
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen">
        <ServicesSidebar />
        <main className="flex-1 min-w-0 overflow-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Booking orders
          </h1>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium">No booking orders yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Booking order entries will appear here after users start booking.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
