"use client";

import { useEffect, useState } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useSearchParams } from "next/navigation";
import ServiceCardUser from "./components/ServiceCardUser";
import { CalendarClock } from "lucide-react";

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }

    fetch(`/api/booking-services?subdomain=${encodeURIComponent(brand)}`)
      .then((response) => response.json())
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [brand]);

  let content = null;
  if (loading) {
    content = <p className="text-gray-500">Loading services...</p>;
  } else if (services.length === 0) {
    content = (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <CalendarClock className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-gray-700 font-medium">No services yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Services will appear here once the brand has set open hours and added booking services.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {services.map((service) => (
          <ServiceCardUser
            key={service._id}
            service={service}
            bookHref={`/services/${service._id}${
              brand ? `?subdomain=${encodeURIComponent(brand)}` : ""
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Services</h1>
      {content}
    </main>
  );
}
