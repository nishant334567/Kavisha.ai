import { connectDB } from "@/app/lib/db";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import BookingAppointment from "@/app/models/BookingAppointment";
import "@/app/models/Users"; // ensure User model is registered for populate
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("brand");
        const serviceId = searchParams.get("serviceId");

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        await connectDB();

        const query = { brand };
        if (serviceId) {
          query.serviceId = new mongoose.Types.ObjectId(serviceId);
        }

        const bookings = await BookingAppointment.find(query)
          .populate("customerId", "name email phone")
          .sort({ createdAt: -1 })
          .lean();

        return NextResponse.json({ bookings });
      } catch (err) {
        console.error("Admin bookings GET error:", err);
        return NextResponse.json(
          { error: "Failed to fetch bookings" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
