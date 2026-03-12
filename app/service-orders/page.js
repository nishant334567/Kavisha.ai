"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  CalendarDays,
  CalendarClock,
  ChevronRight,
  Video,
  Camera,
  Link2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

const CARD_HEADER_COLORS = [
  "bg-[#c5e8e8]", // greenish-blue
  "bg-[#f5f0e6]", // beige / pale yellow
  "bg-[#e8e0f0]", // lavender
  "bg-[#e2e6ec]", // bluish-gray
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
    booking.serviceSnapshot?.subtitle || "Discussion on tinnitus";
  const duration = booking.serviceSnapshot?.duration ?? 25;
  const durationUnit =
    booking.serviceSnapshot?.durationUnit || "Minutes";
  const mode = booking.serviceSnapshot?.mode || "Online";
  const displayDuration =
    durationUnit === "Hours" ? `${duration} hr` : `${duration} min`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Top section: colored header with title, subtitle, action icon, provider thumbnail */}
      <div
        className={`${headerColor} pt-5 pb-8 px-4 relative min-h-[100px]`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Share or view"
                className="shrink-0 p-0.5 text-gray-600 hover:text-gray-900"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-xl bg-white/80 border border-white shadow-sm overflow-hidden flex items-center justify-center -mb-6">
            <User className="w-6 h-6 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Middle section: Payment (with green tint when paid), Duration, Mode */}
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-3 gap-2 items-center border-b border-gray-100 pb-3">
          <div
            className={
              booking.paymentStatus === "completed" && booking.status !== "cancelled"
                ? "bg-green-50 rounded-lg px-3 py-2 -mx-1"
                : ""
            }
          >
            <p className="text-sm font-medium text-gray-900">
              Rs. {Math.round(booking.totalAmount || 0)}/-
            </p>
            <PaymentStatusPill
              status={booking.status}
              paymentStatus={booking.paymentStatus}
            />
          </div>
          <div className="text-sm text-gray-700">
            Duration: {displayDuration}
          </div>
          <div className="text-sm text-gray-700">Mode: {mode}</div>
        </div>

        {/* Bottom section: Session date, Time, Icons */}
        <div className="pt-3 space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>Session: {formatSessionDate(booking.date)}</span>
            <span>Time: {formatTime(booking.startTime)}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              aria-label="LinkedIn"
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <span className="text-[10px] font-bold">in</span>
            </button>
            <button
              type="button"
              aria-label="Video call"
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Camera"
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Link"
              className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Link2 className="w-4 h-4" />
            </button>
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Booking history
        </h1>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-700 font-medium">
            Sign in to view your bookings
          </p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Booking history
        </h1>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">Loading bookings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Booking history
      </h1>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-700 font-medium">No bookings yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
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
