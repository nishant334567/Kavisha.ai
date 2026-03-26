"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { CalendarDays, Link2, User } from "lucide-react";

const CARD_HEADER_COLORS = [
  "bg-muted-bg",
  "bg-background",
  "bg-muted-bg",
  "bg-background",
];

function formatSessionDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31 ? "st" : day === 2 || day === 22 ? "nd" : day === 3 || day === 23 ? "rd" : "th";
  const month = d.toLocaleString("en", { month: "long" });
  return `${day}${suffix} ${month}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(hhmm) {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "am" : "pm";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function PaymentStatusPill({ status, paymentStatus }) {
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Cancelled
      </span>
    );
  }
  if (paymentStatus === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Paid
    </span>
  );
}

function AdminBookingCard({ booking, index }) {
  const customer = booking.customerId;
  const name = typeof customer === "object" && customer ? customer.name : "—";
  const email = typeof customer === "object" && customer ? customer.email : "—";
  const phone = typeof customer === "object" && customer ? customer.phone || "" : "";
  const headerColor = CARD_HEADER_COLORS[index % CARD_HEADER_COLORS.length];
  const title = booking.serviceSnapshot?.title || "Booking";
  const subtitle = booking.serviceSnapshot?.subtitle || "";
  const duration = booking.serviceSnapshot?.duration ?? 25;
  const durationUnit = booking.serviceSnapshot?.durationUnit || "Minutes";
  const mode = booking.serviceSnapshot?.mode || "Online";
  const displayDuration = durationUnit === "Hours" ? `${duration} hr` : `${duration} min`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className={`${headerColor} pt-5 pb-8 px-4 relative min-h-[100px]`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="-mb-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card/80 shadow-sm">
            <User className="w-6 h-6 text-muted" />
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 pb-3">
        <div className="space-y-2 border-b border-border pb-3">
          <div className="text-sm">
            <p className="font-medium text-foreground">Booker</p>
            <p className="text-foreground">{name}</p>
            <p className="text-xs text-muted">{email}</p>
            {phone ? <p className="text-xs text-muted">{phone}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <div
              className={
                booking.paymentStatus === "completed" && booking.status !== "cancelled"
                  ? "-mx-1 rounded-lg bg-green-500/10 px-3 py-2"
                  : ""
              }
            >
              <p className="text-sm font-medium text-foreground">Rs. {Math.round(booking.totalAmount || 0)}/-</p>
              <PaymentStatusPill status={booking.status} paymentStatus={booking.paymentStatus} />
            </div>
            <div className="text-sm text-muted">Duration: {displayDuration}</div>
            <div className="text-sm text-muted">Mode: {mode}</div>
          </div>
        </div>
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Session: {formatSessionDate(booking.date)}</span>
            <span>Time: {formatTime(booking.startTime)}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {booking.meetLink ? (
              <a
                href={booking.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join Google Meet"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg"
              >
                <Link2 className="w-4 h-4" />
                Join meet
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceOrdersPage() {
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const serviceIdFilter = searchParams?.get("serviceId")?.trim() || null;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    const url = new URL("/api/admin/bookings", window.location.origin);
    url.searchParams.set("brand", brand);
    if (serviceIdFilter) url.searchParams.set("serviceId", serviceIdFilter);

    fetch(url.toString(), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBookings(d.bookings || []);
      })
      .catch(() => setError("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [brand, serviceIdFilter]);

  let content;
  if (!brand) {
    content = <p className="text-muted">Select a brand to view bookings.</p>;
  } else if (loading) {
    content = <p className="text-muted">Loading bookings…</p>;
  } else if (error) {
    content = <p className="text-red-600">{error}</p>;
  } else if (bookings.length === 0) {
    content = (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted" />
        <p className="font-medium text-foreground">No booking orders yet</p>
        <p className="mt-1 text-sm text-muted">
          Booking entries will appear here after users start booking.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {bookings.map((b, i) => (
          <AdminBookingCard key={b._id} booking={b} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Booking orders
      </h1>
      {content}
    </div>
  );
}
