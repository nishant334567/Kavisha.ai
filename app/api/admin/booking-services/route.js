import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json(
        { error: "Brand is required" },
        { status: 400 }
      );
    }

    const services = await BookingService.find({ brand }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error("Error fetching booking services:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking services" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      brand,
      title,
      subtitle,
      description,
      image,
      duration,
      durationUnit,
      bufferTime,
      mode,
      cancellationPolicy,
      price,
    } = body;

    if (!brand || !title) {
      return NextResponse.json(
        { error: "Brand and title are required" },
        { status: 400 }
      );
    }

    const service = await BookingService.create({
      brand,
      title: title.trim(),
      subtitle: subtitle || "",
      description: description || "",
      image: image || "",
      duration: Math.max(0, Number(duration) || 0),
      durationUnit:
        durationUnit === "Hours" || durationUnit === "Minutes"
          ? durationUnit
          : "Minutes",
      bufferTime: Math.max(0, Number(bufferTime) || 0),
      mode: mode || "Online (Google meet)",
      cancellationPolicy: cancellationPolicy || "",
      price: Math.max(0, Number(price) || 0),
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Error creating booking service:", error);
    return NextResponse.json(
      { error: "Failed to create booking service" },
      { status: 500 }
    );
  }
}
