import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import WidgetEvent from "@/app/models/WidgetEvent";

const ALLOWED_EVENTS = new Set(["widget_impression", "widget_open"]);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const brand = String(body?.brand || "")
      .trim()
      .toLowerCase();
    const event = String(body?.event || "").trim();
    const pageUrl = String(body?.pageUrl || "").trim().slice(0, 2048);

    if (!brand || !/^[a-z0-9-]+$/.test(brand)) {
      return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
    }
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    await connectDB();
    await WidgetEvent.create({ brand, event, pageUrl });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Widget event tracking failed:", error);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}
