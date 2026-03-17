"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Pencil, List } from "lucide-react";
import ShareButtons from "@/app/components/blog/ShareButtons";

function formatPrice(value) {
  const amount = Number(value) || 0;
  return `Rs. ${Math.round(amount)}/-`;
}

function getServiceShareUrl(serviceId, brand) {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  return `${base}/services/${serviceId}${qs}`;
}

export default function ServiceCard({ service, href, showBookingsHref, brand, openHoursSet }) {
  const router = useRouter();
  const shareUrl = getServiceShareUrl(service?._id, brand);
  const isLive = openHoursSet === true;

  const handleShowBookings = () => {
    if (showBookingsHref) router.push(showBookingsHref);
  };

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      {isLive ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
          Live
        </div>
      ) : (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          Not live — Open hours not set
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
            {service?.image ? (
              <img
                src={service.image}
                alt={service?.title || "Service"}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                No image
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-gray-900">
              {service?.title || "Untitled service"}
            </h2>
            {service?.subtitle ? (
              <p className="mt-1 text-sm text-[#1976D2]">{service.subtitle}</p>
            ) : null}
            {service?.description ? (
              <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-gray-600">
                {service.description}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="w-full max-w-[260px] rounded-lg border border-gray-200 bg-gray-50 p-3 md:w-[260px]">
          <p className="mb-3 text-xs uppercase tracking-wide text-gray-500">
            Advanced settings
          </p>
          <Link
            href={href}
            className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <Pencil className="h-4 w-4" />
            Edit booking details
          </Link>
          <button
            type="button"
            onClick={handleShowBookings}
            className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <List className="h-4 w-4" />
            Show bookings
          </button>
          <div className="mt-3 space-y-1 text-xs text-gray-500">
            <p className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {service?.duration || 0} {service?.durationUnit || "Minutes"}
            </p>
            <p>{formatPrice(service?.price)}</p>
          </div>
        </aside>
      </div>
      {shareUrl && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ShareButtons
            url={shareUrl}
            title={service?.title}
            text={service?.subtitle || service?.title}
            variant="row"
          />
        </div>
      )}
    </article>
  );
}
