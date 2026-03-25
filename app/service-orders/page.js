"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  CalendarDays,
  CalendarClock,
  ChevronRight,
  Link2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

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
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = d.toLocaleString("en", { month: "long" });
  return `${day}${suffix} ${month}`;
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

function BookingCard({ booking, index }) {
  const headerColor =
    CARD_HEADER_COLORS[index % CARD_HEADER_COLORS.length];
  const title = booking.serviceSnapshot?.title || "Booking";
  const subtitle =
    booking.serviceSnapshot?.subtitle || "";
  const duration = booking.serviceSnapshot?.duration ?? 25;
  const durationUnit =
    booking.serviceSnapshot?.durationUnit || "Minutes";
  const mode = booking.serviceSnapshot?.mode || "Online";
  const displayDuration =
    durationUnit === "Hours" ? `${duration} hr` : `${duration} min`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Top section: colored header with title, subtitle, action icon, provider thumbnail */}
      <div
        className={`${headerColor} pt-5 pb-8 px-4 relative min-h-[100px]`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className="truncate text-xl font-bold text-foreground">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Share or view"
                className="shrink-0 p-0.5 text-muted hover:text-foreground"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="-mb-6 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card/80 shadow-sm">
            <User className="h-6 w-6 text-muted" />
          </div>
        </div>
      </div>

      {/* Middle section: Payment (with green tint when paid), Duration, Mode */}
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-3 items-center gap-2 border-b border-border pb-3">
          <div
            className={
              booking.paymentStatus === "completed" && booking.status !== "cancelled"
                ? "-mx-1 rounded-lg bg-green-500/10 px-3 py-2"
                : ""
            }
          >
            <p className="text-sm font-medium text-foreground">
              Rs. {Math.round(booking.totalAmount || 0)}/-
            </p>
            <PaymentStatusPill
              status={booking.status}
              paymentStatus={booking.paymentStatus}
            />
          </div>
          <div className="text-sm text-muted">
            Duration: {displayDuration}
          </div>
          <div className="text-sm text-muted">Mode: {mode}</div>
        </div>

        {/* Bottom section: Session date, Time, Icons */}
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
                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
              >
                <Link2 className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceOrdersPage() {
  const router = useRouter();
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const brand = brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/bookings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <main className="px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Booking history
        </h1>
        <div className="rounded-xl border border-border bg-muted-bg p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="font-medium text-foreground">
            Sign in to view your bookings
          </p>
          <p className="mb-4 mt-1 text-sm text-muted">
            Your service bookings will appear here.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-[#2D545E] text-white hover:bg-[#264850] transition-colors text-sm font-medium"
          >
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Booking history
        </h1>
        <div className="rounded-xl border border-border bg-muted-bg p-8 text-center">
          <p className="text-muted">Loading bookings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Booking history
      </h1>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted-bg p-8 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="font-medium text-foreground">No bookings yet</p>
          <p className="mb-4 mt-1 text-sm text-muted">
            Your service bookings will appear here.
          </p>
          <Link
            href={`/services${qs}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D545E] text-white hover:bg-[#264850] transition-colors text-sm font-medium"
          >
            <CalendarClock className="w-4 h-4" />
            Book a service
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {bookings.map((booking, index) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              index={index}
            />
          ))}
        </div>
      )}
    </main>
  );
}
