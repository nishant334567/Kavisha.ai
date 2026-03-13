import { connectDB } from "@/app/lib/db";
import BookingAvailability from "@/app/models/BookingAvailability";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    // Return existing doc or create a default one so frontend always has data
    let availability = await BookingAvailability.findOne({ brand }).lean();

    if (!availability) {
      availability = await BookingAvailability.create({ brand });
      availability = availability.toObject();
    }

    return NextResponse.json(
      {
        weeklySchedule: availability.weeklySchedule,
        dateOverrides: availability.dateOverrides,
        timezone: availability.timezone,
        rules: availability.rules,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching booking availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking availability" },
      { status: 500 }
    );
  }
}


export async function PATCH(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");
    const { weeklySchedule, dateOverrides, timezone, rules } = await req.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const update = {};

    if (weeklySchedule !== undefined) {
      update.weeklySchedule = weeklySchedule;
    }

    if (timezone !== undefined) {
      update.timezone = timezone;
    }

    if (rules !== undefined) {
      update.rules = rules;
    }

    if (dateOverrides !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 60);

      // Keep only future overrides within next 60 days
      update.dateOverrides = dateOverrides.filter((o) => {
        const d = new Date(o.date);
        return d >= today && d <= maxDate;
      });
    }

    const updated = await BookingAvailability.findOneAndUpdate(
      { brand },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json(
      {
        weeklySchedule: updated.weeklySchedule,
        dateOverrides: updated.dateOverrides,
        timezone: updated.timezone,
        rules: updated.rules,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating booking availability:", error);
    return NextResponse.json(
      { error: "Failed to update booking availability" },
      { status: 500 }
    );
  }
}