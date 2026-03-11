"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import ServicesSidebar from "./components/ServicesSidebar";
import { CalendarClock } from "lucide-react";
import ServiceCard from "./components/ServiceCard";

export default function ServicesListPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    fetch(`/api/admin/booking-services?brand=${encodeURIComponent(brand)}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [brand]);

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-6xl flex min-h-screen">
        <ServicesSidebar />
        <main className="flex-1 min-w-0 overflow-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">List of services</h1>
            <Link
              href={`/admin/services/add-new${qs}`}
              className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#24454E]"
            >
              Add booking
            </Link>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading services...</p>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <CalendarClock className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-700 font-medium">No services yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first booking service.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  href={`/admin/services/${service._id}/edit${qs}`}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
