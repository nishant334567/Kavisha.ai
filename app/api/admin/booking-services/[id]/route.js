import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { refreshImageUrl } from "@/app/lib/gcs";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const service = await BookingService.findById(id).lean();

    if (!service) {
      return NextResponse.json(
        { error: "Booking service not found" },
        { status: 404 }
      );
    }

    const image = service.image ? await refreshImageUrl(service.image) : "";

    return NextResponse.json({ service: { ...service, image } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching booking service:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking service" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const {
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

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const update = {
      title: title.trim(),
      subtitle: subtitle ?? "",
      description: description ?? "",
      image: image ?? "",
      duration: Math.max(0, Number(duration) || 0),
      durationUnit:
        durationUnit === "Hours" || durationUnit === "Minutes"
          ? durationUnit
          : "Minutes",
      bufferTime: Math.max(0, Number(bufferTime) || 0),
      mode: mode ?? "Online (Google meet)",
      cancellationPolicy: cancellationPolicy ?? "",
      price: Math.max(0, Number(price) || 0),
    };

    const service = await BookingService.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!service) {
      return NextResponse.json(
        { error: "Booking service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ service }, { status: 200 });
  } catch (error) {
    console.error("Error updating booking service:", error);
    return NextResponse.json(
      { error: "Failed to update booking service" },
      { status: 500 }
    );
  }
}
