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
    <div className="max-w-xl rounded-xl border border-border bg-card p-6 text-foreground shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-green-600" />
        <div>
          <h2 className="text-xl font-semibold text-highlight">Booking saved</h2>
          <p className="mt-1 text-sm text-muted">
            {serviceTitle || "Your service"} is ready.
          </p>
        </div>
      </div>

      {openHoursSet === null ? (
        <p className="mb-4 text-sm text-muted">Checking open hours…</p>
      ) : openHoursSet ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-green-700 dark:text-green-300">
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

      <div className="border-t border-border pt-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          <Share2 className="h-4 w-4" />
          Share your service
        </p>
        <ShareButtons url={shareUrl} title={serviceTitle} text={serviceTitle} variant="row" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
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
    <div className="max-w-xl rounded-xl border border-border bg-card p-6 text-foreground shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-xl font-semibold text-highlight">
            {isPublished ? "Post published" : "Draft saved"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {title || "Your post"} {isPublished ? "is live." : "has been saved."}
          </p>
        </div>
      </div>

      {isPublished && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
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
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
        >
          Back to list
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs/${encodeURIComponent(slug)}/edit${qs}`)}
          className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Edit post
        </button>
      </div>
    </div>
  );
}
