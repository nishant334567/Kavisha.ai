"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe,
  MapPin,
} from "lucide-react";

function ensureRazorpayLoaded() {
  if (typeof window === "undefined" || window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load payment"));
    document.body.appendChild(s);
  });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleString("en", { month: "short" });
  return `${day} ${month}`;
}

function formatTimeSlot(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? "am" : "pm";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function DetailChip({ active, onClick, top, bottom }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-w-[88px] rounded-xl border px-2 py-1 text-center transition-colors",
        active
          ? "border-[#2D545E] bg-[#2D545E] text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#2D545E]/40",
      ].join(" ")}
    >
      <p className="text-sm leading-none font-semibold">{top}</p>
      <p className="mt-1 text-sm leading-none">{bottom}</p>
    </button>
  );
}

export default function ServiceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotsMap, setSlotsMap] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [slotsApiData, setSlotsApiData] = useState(null);
  const [slotsApiLoading, setSlotsApiLoading] = useState(false);
  const [slotsApiError, setSlotsApiError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [bookError, setBookError] = useState("");

  useEffect(() => {
    if (!brand || !serviceId) {
      setLoading(false);
      return;
    }

    async function loadService() {
      try {
        const res = await fetch(
          `/api/booking-services?subdomain=${encodeURIComponent(brand)}`
        );
        const data = await res.json();
        const found =
          (data.services || []).find((item) => item._id === serviceId) || null;
        setService(found);
      } catch {
        setService(null);
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [brand, serviceId]);

  useEffect(() => {
    if (!serviceId || !brand) return;

    async function loadSlots() {
      setSlotsApiLoading(true);
      setSlotsApiError(null);
      try {
        const url = `/api/booking-services/${serviceId}/slots?days=21&brand=${encodeURIComponent(brand)}`;
        const res = await fetch(url);
        const data = await res.json();
        setSlotsApiData(data);
        if (data.slots && typeof data.slots === "object") {
          setSlotsMap(data.slots);
        }
      } catch (err) {
        setSlotsApiError(err.message || "Failed to load slots");
        setSlotsApiData(null);
      } finally {
        setSlotsApiLoading(false);
      }
    }

    loadSlots();
  }, [serviceId, brand]);

  const datesWithDay = slotsApiData?.datesWithDay ?? [];
  const visibleDates = useMemo(() => {
    const start = weekOffset * 7;
    return datesWithDay.slice(start, start + 7);
  }, [datesWithDay, weekOffset]);
  const maxWeekOffset = Math.max(0, Math.ceil(datesWithDay.length / 7) - 1);
  const timeSlots = selectedDate ? slotsMap[selectedDate] ?? [] : [];

  const handleBook = async () => {
    if (!user?.id || !serviceId || !selectedDate || !selectedTime) return;
    setBookError("");
    setPaying(true);
    try {
      const res = await fetch(
        `/api/booking-services/${serviceId}/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: selectedDate, startTime: selectedTime }),
        }
      );
      const data = await res.json();
      if (!data?.orderId) {
        throw new Error(data?.error || "Failed to create order");
      }

      await ensureRazorpayLoaded();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || "INR",
        order_id: data.orderId,
        name: "Kavisha",
        description: `${resolvedService.title} - Booking`,
        prefill: { email: user?.email || "" },
        modal: { ondismiss: () => setPaying(false) },
        handler: async function (response) {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user.id,
              type: "booking",
              metadata: { appointmentId: data.appointmentId },
              amount: data.amount,
              currency: data.currency || "INR",
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData?.success) {
            router.push("/service-orders");
          } else {
            setPaying(false);
            setBookError(verifyData?.error || "Payment verification failed.");
          }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setPaying(false);
        setBookError("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      setPaying(false);
      setBookError(err?.message || "Something went wrong.");
    }
  };

  const resolvedService = useMemo(
    () => ({
      title: service?.title || "Service",
      subtitle: service?.subtitle || "",
      description:
        service?.description ||
        "",
      image: service?.image || "",
      price: Math.round(service?.price || 499),
      duration: service?.duration || 25,
      durationUnit: service?.durationUnit || "min",
      mode: service?.mode || "Online",
      host: brandContext?.brandName || "Service Host",
    }),
    [service, brandContext?.brandName]
  );

  if (loading) {
    return (
      <main className="px-6 py-8">
        <p className="text-sm text-gray-500">Loading service details...</p>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="px-6 py-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 max-w-lg">
          <p className="font-medium text-amber-800">Not available for booking</p>
          <p className="mt-1 text-sm text-amber-700">
            This service is not live. Open hours have not been set, or the service may have been removed.
          </p>
          <button
            type="button"
            onClick={() => router.push(brand ? `/services?subdomain=${encodeURIComponent(brand)}` : "/services")}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Back to services
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section>
      

            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 bg-[#D8E8EC] p-4">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {resolvedService.title}
                  </h1>
                  {resolvedService.subtitle ? (
                    <p className="mt-1 text-sm text-justify text-gray-700">
                      {resolvedService.subtitle}
                    </p>
                  ) : null}
                </div>
                <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-white/70 bg-gray-100">
                  {resolvedService.image ? (
                    <img
                      src={resolvedService.image}
                      alt={resolvedService.title}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-y border-gray-200 px-4 py-3 text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                  <Banknote className="h-4 w-4 text-[#21A128]" />
                  <span className="font-medium text-[#21A128]">
                    Rs. {resolvedService.price}/-
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                  <Clock3 className="h-4 w-4 text-[#2A7F98]" />
                  <span>
                    {resolvedService.duration} {resolvedService.durationUnit}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1">
                  {(resolvedService.mode || "").toLowerCase().includes("online") ? (
                    <Globe className="h-4 w-4 text-[#2D545E]" />
                  ) : (
                    <MapPin className="h-4 w-4 text-[#2D545E]" />
                  )}
                  <span>{resolvedService.mode}</span>
                </span>
              </div>

              {resolvedService.description ? (
                <div className="p-4">
                  <div
                    className="prose prose-gray max-w-none text-justify text-gray-600 prose-p:text-gray-600 prose-headings:text-center prose-headings:text-gray-900 prose-strong:text-gray-900 prose-a:text-[#2D545E]"
                    dangerouslySetInnerHTML={{
                      __html: resolvedService.description,
                    }}
                  />
                </div>
              ) : null}
            </article>
          </section>

          <section>
            <h2 className="text-[28px] font-medium text-[#1B5A67]">
              Select date and time
            </h2>

            {slotsApiLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading dates…</p>
            ) : slotsApiError ? (
              <p className="mt-4 text-sm text-red-600">{slotsApiError}</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                    disabled={weekOffset === 0}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {visibleDates.map((item) => (
                    <DetailChip
                      key={item.date}
                      top={item.dayName}
                      bottom={formatDateLabel(item.date)}
                      active={selectedDate === item.date}
                      onClick={() => {
                        setSelectedDate(item.date);
                        setSelectedTime(null);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setWeekOffset((o) => Math.min(maxWeekOffset, o + 1))
                    }
                    disabled={weekOffset >= maxWeekOffset}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 disabled:opacity-40"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <h3 className="mt-8 text-lg font-medium text-gray-700">
                  Select time
                </h3>
                {selectedDate ? (
                  timeSlots.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      No slots available this day.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {timeSlots.map((hhmm) => (
                        <button
                          key={hhmm}
                          type="button"
                          onClick={() => setSelectedTime(hhmm)}
                          className={[
                            "rounded-xl border px-5 py-2 text-sm transition-colors",
                            selectedTime === hhmm
                              ? "border-[#2D545E] bg-[#2D545E] text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-[#2D545E]/40",
                          ].join(" ")}
                        >
                          {formatTimeSlot(hhmm)}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    Pick a date to see times.
                  </p>
                )}

                <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="h-4 w-4" />
                  GMT +5:30
                </div>

                {bookError && (
                  <p className="mt-4 text-sm text-red-600">{bookError}</p>
                )}

                {!user ? (
                  <p className="mt-6 text-sm text-gray-500">
                    Sign in to book this service.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={!selectedDate || !selectedTime || paying}
                    onClick={handleBook}
                    className="mt-6 rounded-full bg-[#2D545E] px-10 py-2.5 text-sm font-semibold text-white hover:bg-[#264850] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#2D545E]"
                  >
                    {paying ? "Opening payment…" : "Book"}
                  </button>
                )}
              </>
            )}
          </section>
        </div>
    </main>
  );
}
