"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
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
  const [openHoursSet, setOpenHoursSet] = useState(false);

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/admin/booking-services?brand=${encodeURIComponent(brand)}`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/admin/booking-availability?brand=${encodeURIComponent(brand)}`, {
        credentials: "include",
      }).then((r) => r.json()),
    ])
      .then(([servicesData, availabilityData]) => {
        setServices(servicesData.services || []);
        const schedule = availabilityData.weeklySchedule || [];
        const hasHours = schedule.some(
          (day) =>
            day.enabled &&
            Array.isArray(day.intervals) &&
            day.intervals.length > 0
        );
        setOpenHoursSet(!!hasHours);
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [brand]);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">List of services</h1>
            <Link
              href={`/admin/services/add-new${qs}`}
              className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#24454E]"
            >
              Add booking
            </Link>
          </div>

          {loading ? (
            <p className="text-muted">Loading services...</p>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted" />
              <p className="font-medium text-foreground">No services yet</p>
              <p className="mt-1 text-sm text-muted">
                Create your first booking service.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  brand={brand}
                  openHoursSet={openHoursSet}
                  href={`/admin/services/${service._id}/edit${qs}`}
                  showBookingsHref={`/admin/services/orders${qs}${qs ? "&" : "?"}serviceId=${service._id}`}
                />
              ))}
            </div>
          )}
    </>
  );
}
