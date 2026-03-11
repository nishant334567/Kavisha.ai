"use client";

import { CalendarDays } from "lucide-react";

export default function ServiceOrdersPage() {
  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Booking history
      </h1>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-700 font-medium">No bookings yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Your service bookings will appear here.
        </p>
      </div>
    </main>
  );
}
