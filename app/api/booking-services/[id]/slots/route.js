import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { NextResponse } from "next/server";
import BookingAppointment from "@/app/models/BookingAppointment";
import BookingAvailability from "@/app/models/BookingAvailability";

/** "09:00" -> 540 (minutes from midnight) */
function timeStrToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const [h, m] = str.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 540 -> "09:00" */
function minutesToTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** All times in minutes. bookedSlot.startTime/endTime are "HH:MM" strings. */
const isEligibleSlot = (bookedSlots, startMinutes, endMinutesWithBuffer) => {
  for (const booked of bookedSlots) {
    const bStart = timeStrToMinutes(booked.startTime);
    const bEnd = timeStrToMinutes(booked.endTime);
    if (startMinutes < bEnd && endMinutesWithBuffer > bStart) return false;
  }
  return true;
};

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id: serviceId } = await params;
    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days");
    const brand = searchParams.get("brand") || searchParams.get("subdomain");

    const service = await BookingService.findById(serviceId).lean();
    if (!service) {
      return NextResponse.json(
        { error: "Booking service not found" },
        { status: 404 },
      );
    }

    const availability = await BookingAvailability.findOne({
      brand: service.brand,
    }).lean();
    if (!availability) {
      return NextResponse.json(
        { error: "Booking availability not found" },
        { status: 404 },
      );
    }

    const tz = availability.timezone || "Asia/Kolkata";
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: tz });
    const timeStr = now.toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [h, m] = timeStr.split(":").map(Number);
    const nowMinutesInTz = h * 60 + m;
    const minNoticeMinutes = availability.rules?.minNoticeMinutes ?? 120;

    const bookedAppointments = await BookingAppointment.find({
      serviceId,
      date: { $gte: today },
      status: { $in: ["pending", "confirmed"] },
    }).lean();
    const numDays = Math.min(Number(days) || 21, 21);
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const slots = {};
    const datesWithDay = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(today + "T00:00:00.000"); //date at midnight
      date.setDate(date.getDate() + i);
      const dateStr =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");
      const dayofweek = date.getDay();
      datesWithDay.push({ date: dateStr, dayName: DAY_NAMES[dayofweek] });

      let openIntervals;
      let bookedSlots = bookedAppointments.filter((ap) => ap.date === dateStr);
      const override = availability.dateOverrides?.find(
        (ov) => ov.date === dateStr,
      );
      if (override) {
        if (override.isClosed) {
          openIntervals = [];
        } else {
          openIntervals = override.intervals;
        }
      } else {
        const daySchedule = availability.weeklySchedule?.find(
          (d) => d.day === dayofweek,
        );
        if (!daySchedule?.enabled || !daySchedule.intervals?.length) {
          openIntervals = [];
        } else {
          openIntervals = daySchedule.intervals;
        }
      }

      if (openIntervals.length > 0) {
        const durationMinutes =
          service.durationUnit === "Hours"
            ? (service.duration || 0) * 60
            : service.duration || 0;
        const bufferMinutes = service.bufferTime || 0;
        const slotLengthMinutes = durationMinutes + bufferMinutes;
        const slotStepMinutes = availability.rules?.slotStepMinutes ?? 15;

        for (const interval of openIntervals) {
          const intervalStartMinutes = timeStrToMinutes(interval.start);
          const intervalEndMinutes = timeStrToMinutes(interval.end);

          for (
            let slotStartMinutes = intervalStartMinutes;
            slotStartMinutes + slotLengthMinutes <= intervalEndMinutes;
            slotStartMinutes += slotStepMinutes
          ) {
            const endMinutesWithBuffer = slotStartMinutes + slotLengthMinutes;
            const eligible = isEligibleSlot(
              bookedSlots,
              slotStartMinutes,
              endMinutesWithBuffer,
            );
            const isToday = dateStr === today;
            const afterNotice =
              !isToday || slotStartMinutes >= nowMinutesInTz + minNoticeMinutes;
            if (eligible && afterNotice) {
              slots[dateStr] = slots[dateStr] || [];
              slots[dateStr].push(minutesToTimeStr(slotStartMinutes));
            }
          }
        }
      }
    }

    return NextResponse.json({ slots, datesWithDay });
  } catch (error) {
    console.error("Error fetching booking service slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking service slots" },
      { status: 500 },
    );
  }
}
