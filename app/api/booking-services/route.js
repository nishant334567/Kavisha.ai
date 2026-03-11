import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("subdomain") || searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "subdomain or brand is required" },
        { status: 400 }
      );
    }

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
