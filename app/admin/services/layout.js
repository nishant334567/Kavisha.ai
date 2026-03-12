"use client";

import ServicesSidebar from "./components/ServicesSidebar";

export default function AdminServicesLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen">
        <ServicesSidebar />
        <main className="flex-1 min-w-0 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
