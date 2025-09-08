import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Events from "@/app/models/Events";
import { getToken } from "next-auth/jwt";

export async function POST(request) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Please login" }, { status: 401 });
    }

    await connectDB();

    const { title, description, link, contentType } = await request.json();

    if (!title || !description || !contentType) {
      return NextResponse.json(
        { error: "Title, description and content type are required" },
        { status: 400 }
      );
    }

    const newEvent = new Events({
      title,
      description,
      link: link || "",
      contentType,
      userId: token.id,
    });

    await newEvent.save();

    return NextResponse.json({
      success: true,
      message: "Created successfully",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Please login" }, { status: 401 });
    }

    await connectDB();

    const events = await Events.find({ userId: token.id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
