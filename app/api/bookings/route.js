import { connectDB } from "@/app/lib/db";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import BookingAppointment from "@/app/models/BookingAppointment";
import User from "@/app/models/Users";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await connectDB();
        const bookings = await BookingAppointment.find({
          customerId: new mongoose.Types.ObjectId(user.id),
        })
          .sort({ createdAt: -1 })
          .lean();

        const dbUser = await User.findById(user.id)
          .select("name email phone")
          .lean();
        const booker = {
          name: dbUser?.name ?? user.name ?? "",
          email: dbUser?.email ?? user.email ?? "",
          phone: dbUser?.phone ?? "",
        };

        return NextResponse.json({ bookings, booker });
      } catch (err) {
        console.error("Bookings GET error:", err);
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
