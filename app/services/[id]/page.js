"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ChevronLeft, ChevronRight, Globe, ChevronDown } from "lucide-react";

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
        "min-w-[88px] rounded-xl border px-3 py-2 text-center transition-colors",
        active
          ? "border-[#2D545E] bg-[#2D545E] text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#2D545E]/40",
      ].join(" ")}
    >
      <p className="text-[11px] leading-none">{top}</p>
      <p className="mt-1 text-[11px] leading-none">{bottom}</p>
    </button>
  );
}

export default function ServiceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState("GMT +5:30");

  const [slotsMap, setSlotsMap] = useState({});     // the full map from API
  const [weekOffset, setWeekOffset] = useState(0);  // 0, 1, or 2
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [slotsApiData, setSlotsApiData] = useState(null);
  const [slotsApiLoading, setSlotsApiLoading] = useState(false);
  const [slotsApiError, setSlotsApiError] = useState(null);

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
        console.log("[Slots API response]", data);
        setSlotsApiData(data);
        if (data.slots && typeof data.slots === "object") {
          setSlotsMap(data.slots);
        }
      } catch (err) {
        console.error("[Slots API error]", err);
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

  const resolvedService = useMemo(
    () => ({
      title: service?.title || "Tinnitus",
      subtitle: service?.subtitle || "Discussion on tinnitus",
      description:
        service?.description ||
        "This discussion will explore tinnitus and hyperacusis, focusing on their symptoms, underlying causes, and daily impact. We will cover coping strategies, sound sensitivity management, and current research insights.",
      image: service?.image || "",
      price: Math.round(service?.price || 499),
      duration: service?.duration || 25,
      durationUnit: service?.durationUnit || "min",
      mode: service?.mode || "Online",
      host: brandContext?.brandName || "Service Host",
    }),
    [service, brandContext?.brandName]
  );

  return (
    <main className="px-6 py-8">
      {loading ? (
        <p className="text-sm text-gray-500">Loading service details...</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
          <section>
            <p className="mb-4 text-[28px] font-medium text-[#1B5A67]">
              {resolvedService.host}
            </p>

            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 bg-[#D8E8EC] p-4">
                <div>
                  <h1 className="text-4xl font-medium tracking-wide text-gray-900">
                    {resolvedService.title}
                  </h1>
                  <p className="mt-1 text-xl text-gray-700">
                    {resolvedService.subtitle}
                  </p>
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

              <div className="border-y border-gray-200 px-4 py-3 text-sm text-gray-700">
                <span className="font-medium text-[#21A128]">
                  Price: Rs. {resolvedService.price}/-
                </span>
                <span className="mx-4 text-gray-400">|</span>
                <span>
                  Duration: {resolvedService.duration}{" "}
                  {resolvedService.durationUnit}
                </span>
                <span className="mx-4 text-gray-400">|</span>
                <span>Mode: {resolvedService.mode}</span>
              </div>

              <div className="p-4">
                <p className="text-sm leading-6 text-gray-600">
                  {resolvedService.description}
                </p>
              </div>
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
                  {selectedTimezone}
                </div>

                <button
                  type="button"
                  className="mt-6 rounded-full bg-[#2D545E] px-10 py-2.5 text-sm font-semibold text-white hover:bg-[#264850]"
                >
                  Book
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
