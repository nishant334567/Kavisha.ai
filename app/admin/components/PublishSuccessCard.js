"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CalendarClock, Share2 } from "lucide-react";
import ShareButtons from "@/app/components/blog/ShareButtons";
import ShareAsEmailButton from "@/app/components/blog/ShareAsEmailButton";

function buildPublicUrl(path, brand) {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  return `${base}${path}${qs}`;
}

export function ServiceSuccessCard({ serviceId, serviceTitle, brand, onBackToList }) {
  const router = useRouter();
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const [openHoursSet, setOpenHoursSet] = useState(null);

  useEffect(() => {
    if (!brand) return;
    fetch(`/api/admin/booking-availability?brand=${encodeURIComponent(brand)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const schedule = data.weeklySchedule || [];
        const hasHours = schedule.some(
          (day) => day.enabled && Array.isArray(day.intervals) && day.intervals.length > 0
        );
        setOpenHoursSet(!!hasHours);
      })
      .catch(() => setOpenHoursSet(false));
  }, [brand]);

  const shareUrl = buildPublicUrl(`/services/${serviceId}`, brand);
  const calendarHref = `/admin/services/calender${qs}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-xl">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Booking saved</h2>
          <p className="text-sm text-gray-600 mt-1">
            {serviceTitle || "Your service"} is ready.
          </p>
        </div>
      </div>

      {openHoursSet === null ? (
        <p className="text-sm text-gray-500 mb-4">Checking open hours…</p>
      ) : openHoursSet ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Your service is live</span>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 mb-4">
          <p className="text-sm text-amber-800 font-medium">Your service is not live yet</p>
          <p className="text-xs text-amber-700 mt-1">Set open hours so customers can book slots.</p>
          <button
            type="button"
            onClick={() => router.push(calendarHref)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            <CalendarClock className="h-4 w-4" />
            Set open hours
          </button>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share your service
        </p>
        <ShareButtons url={shareUrl} title={serviceTitle} text={serviceTitle} variant="row" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to list
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/services/${serviceId}/edit${qs}`)}
          className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#24454E]"
        >
          Edit service
        </button>
      </div>
    </div>
  );
}

export function BlogSuccessCard({ slug, title, brand, isPublished, onBackToList }) {
  const router = useRouter();
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  const shareUrl = buildPublicUrl(`/blogs/${slug}`, brand);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-xl">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isPublished ? "Post published" : "Draft saved"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {title || "Your post"} {isPublished ? "is live." : "has been saved."}
          </p>
        </div>
      </div>

      {isPublished && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share your post
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <ShareButtons url={shareUrl} title={title} text={title} variant="row" />
            {brand && (
              <ShareAsEmailButton slug={slug} brand={brand} title={title} variant="row" />
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to list
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs/${encodeURIComponent(slug)}/edit${qs}`)}
          className="rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#24454E]"
        >
          Edit post
        </button>
      </div>
    </div>
  );
}
