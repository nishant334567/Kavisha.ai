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
    content = <p className="text-muted">Loading services...</p>;
  } else if (services.length === 0) {
    content = (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted" />
        <p className="font-medium text-foreground">No services yet</p>
        <p className="mt-1 text-sm text-muted">
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
      <h1 className="mb-6 text-2xl font-bold text-foreground">Book My Services</h1>
      {content}
    </main>
  );
}
