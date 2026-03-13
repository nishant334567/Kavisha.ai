import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { client as sanityClient } from "@/app/lib/sanity";
import { NextResponse } from "next/server";

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
    const services = await BookingService.find({ brand })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error("Error fetching booking services:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking services" },
      { status: 500 }
    );
  }
}
