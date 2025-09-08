import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Events from "@/app/models/Events";
import { getToken } from "next-auth/jwt";

export async function GET(request, { params }) {
  const { brandName } = await params;
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Please login" }, { status: 401 });
    }

    await connectDB();

    const events = await Events.find({
      brandName: brandName.toLowerCase(),
    }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
