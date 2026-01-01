import { connectDB } from "@/app/lib/db";
import Service from "@/app/models/Service";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const services = await Service.find({ brand }).sort({ createdAt: -1 });

    return NextResponse.json({ services }, { status: 200 });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, description, brand } = body;

    if (!name || !brand) {
      return NextResponse.json(
        { error: "Name and brand are required" },
        { status: 400 }
      );
    }

    const service = await Service.create({
      name,
      description: description || "",
      brand,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
