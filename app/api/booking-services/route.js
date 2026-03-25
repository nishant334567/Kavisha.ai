import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import BookingAvailability from "@/app/models/BookingAvailability";
import { refreshImageUrl } from "@/app/lib/gcs";
import { client as sanityClient } from "@/app/lib/sanity";
import { NextResponse } from "next/server";

function hasOpenHoursSet(weeklySchedule) {
  if (!Array.isArray(weeklySchedule)) return false;
  return weeklySchedule.some(
    (day) => day.enabled && Array.isArray(day.intervals) && day.intervals.length > 0
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("subdomain") || searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "subdomain or brand is required" },
        { status: 400 }
      );
    }

    if (sanityClient) {
      const brandDoc = await sanityClient.fetch(
        `*[_type == "brand" && subdomain == $brand][0]{ enableBooking }`,
        { brand }
      );
      if (brandDoc && brandDoc.enableBooking === false) {
        return NextResponse.json({ services: [] }, { status: 200 });
      }
    }

    await connectDB();

    const availability = await BookingAvailability.findOne({ brand }).lean();
    if (!availability || !hasOpenHoursSet(availability.weeklySchedule)) {
      return NextResponse.json({ services: [] }, { status: 200 });
    }

    const services = await BookingService.find({ brand })
      .sort({ createdAt: -1 })
      .lean();

    const servicesWithFreshImages = await Promise.all(
      services.map(async (service) => ({
        ...service,
        image: service.image ? await refreshImageUrl(service.image) : "",
      }))
    );

    return NextResponse.json({ services: servicesWithFreshImages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching booking services:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking services" },
      { status: 500 }
    );
  }
}
