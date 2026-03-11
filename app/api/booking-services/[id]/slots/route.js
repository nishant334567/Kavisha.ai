import { connectDB } from "@/app/lib/db";
import BookingAvailability from "@/app/models/BookingAvailability";
import BookingAppointment from "@/app/models/BookingAppointment";
import BookingService from "@/app/models/BookingService";
import { NextResponse } from "next/server";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getOpenIntervalsForDate(dateString, weeklySchedule, dateOverrides) {
  const override = dateOverrides?.find((o) => o.date === dateString);
  if (override) {
    if (override.isClosed) return [];
    return override.intervals?.length ? override.intervals : [];
  }
  const dayOfWeek = new Date(dateString + "T00:00:00").getDay();
  const daySchedule = weeklySchedule?.find((s) => s.day === dayOfWeek);
  if (!daySchedule?.enabled || !daySchedule?.intervals?.length) return [];
  return daySchedule.intervals;
}

function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotsOverlap(slotStartMin, slotEndMin, bookStartMin, bookEndMin) {
  return slotStartMin < bookEndMin && slotEndMin > bookStartMin;
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const days = searchParams.get("days");
    const brand = searchParams.get("brand") || searchParams.get("subdomain");

    const parsed = {
      serviceId: id,
      days: days != null ? parseInt(days, 10) : null,
      brand: brand || null,
    };

    await connectDB();
    // service level details
    const serviceDetails = await BookingService.findById(id).lean();
    if (!serviceDetails) {
      return NextResponse.json(
        { error: "Booking service not found" },
        { status: 404 }
      );
    }

    const { duration, durationUnit, bufferTime, brand: serviceBrand } = serviceDetails;

    const numDays = parsed.days != null && parsed.days > 0 ? parsed.days : 21;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateStrings = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateStrings.push(`${y}-${m}-${day}`);
    }

    const availability = await BookingAvailability.findOne({ brand: serviceBrand }).lean();
    if (!availability) {
      const datesWithDay = dateStrings.map((dateString) => {
        const dayOfWeek = new Date(dateString + "T00:00:00").getDay();
        return { date: dateString, day: dayOfWeek, dayName: DAY_NAMES[dayOfWeek] };
      });
      return NextResponse.json(
        {
          message: "Slots API — params captured",
          request: parsed,
          service: { duration, durationUnit, bufferTime, brand: serviceBrand },
          availability: null,
          dateWindow: dateStrings,
          datesWithDay,
          slots: {},
        },
        { status: 200 }
      );
    }

    const { weeklySchedule, dateOverrides, rules, timezone } = availability;

    const durationMinutes =
      durationUnit === "Hours" ? (duration || 0) * 60 : duration || 0;
    const slotLengthMinutes = durationMinutes + (bufferTime || 0);
    const stepMin = rules?.slotStepMinutes ?? 15;
    const minNoticeMin = rules?.minNoticeMinutes ?? 120;

    const now = new Date();
    const nowMinutes =
      now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    const existingBookings = await BookingAppointment.find({
      serviceId: id,
      date: { $in: dateStrings },
      status: { $nin: ["cancelled"] },
    })
      .select("date startTime endTime")
      .lean();

    const bookingsByDate = {};
    for (const b of existingBookings) {
      if (!bookingsByDate[b.date]) bookingsByDate[b.date] = [];
      bookingsByDate[b.date].push({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      });
    }

    const slots = {};
    const datesWithDay = [];

    for (const dateString of dateStrings) {
      const dayOfWeek = new Date(dateString + "T00:00:00").getDay();
      const dayName = DAY_NAMES[dayOfWeek];
      datesWithDay.push({ date: dateString, day: dayOfWeek, dayName });

      const intervals = getOpenIntervalsForDate(
        dateString,
        weeklySchedule,
        dateOverrides
      );
      const dayBookings = bookingsByDate[dateString] || [];

      const isToday =
        dateString ===
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const cutoffMinutes = isToday ? nowMinutes + minNoticeMin : 0;

      const list = [];
      for (const iv of intervals) {
        const startMin = timeToMinutes(iv.start);
        const endMin = timeToMinutes(iv.end);
        for (
          let slotStart = startMin;
          slotStart + slotLengthMinutes <= endMin;
          slotStart += stepMin
        ) {
          const slotEnd = slotStart + slotLengthMinutes;
          if (slotStart < cutoffMinutes) continue;
          const blocked = dayBookings.some((b) =>
            slotsOverlap(slotStart, slotEnd, b.start, b.end)
          );
          if (!blocked) list.push(minutesToTime(slotStart));
        }
      }
      slots[dateString] = list;
    }

    return NextResponse.json(
      {
        message: "Slots API — params captured",
        request: parsed,
        service: { duration, durationUnit, bufferTime, brand: serviceBrand },
        availability: { weeklySchedule, dateOverrides, rules, timezone },
        dateWindow: dateStrings,
        datesWithDay,
        slots,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in slots API:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}
