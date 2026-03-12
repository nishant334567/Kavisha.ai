import { connectDB } from "@/app/lib/db";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createRazorpayOrder } from "@/app/lib/razorpay";
import BookingService from "@/app/models/BookingService";
import BookingAppointment from "@/app/models/BookingAppointment";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

function timeStrToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const [h, m] = str.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTimeStr(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** startTime "HH:MM" + durationMinutes + bufferMinutes -> endTime "HH:MM" */
function addMinutesToTime(startTimeStr, durationMinutes, bufferMinutes) {
  const start = timeStrToMinutes(startTimeStr);
  const total = start + durationMinutes + bufferMinutes;
  return minutesToTimeStr(total);
}

function rupeesToPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

export async function POST(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { id: serviceId } = await params;
        const body = await req.json().catch(() => ({}));
        const { date, startTime } = body;

        if (!date || !startTime) {
          return NextResponse.json(
            { error: "date and startTime are required" },
            { status: 400 }
          );
        }

        await connectDB();

        const service = await BookingService.findById(serviceId).lean();
        if (!service) {
          return NextResponse.json(
            { error: "Booking service not found" },
            { status: 404 }
          );
        }

        const durationMinutes =
          service.durationUnit === "Hours"
            ? (service.duration || 0) * 60
            : service.duration || 0;
        const bufferMinutes = service.bufferTime || 0;
        const endTime = addMinutesToTime(startTime, durationMinutes, bufferMinutes);

        const conflicting = await BookingAppointment.findOne({
          serviceId: new mongoose.Types.ObjectId(serviceId),
          date,
          status: { $in: ["pending", "confirmed"] },
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        }).lean();

        if (conflicting) {
          return NextResponse.json(
            { error: "This slot is no longer available" },
            { status: 409 }
          );
        }

        const serviceSnapshot = {
          title: service.title || "",
          duration: service.duration ?? 0,
          durationUnit: service.durationUnit || "Minutes",
          mode: service.mode || "",
          price: service.price ?? 0,
        };

        const totalAmount = Math.max(0, Number(service.price) || 0);
        const amountPaise = rupeesToPaise(totalAmount);
        if (amountPaise < 100) {
          return NextResponse.json(
            { error: "Minimum amount is ₹1" },
            { status: 400 }
          );
        }

        const appointment = await BookingAppointment.create({
          brand: service.brand,
          serviceId: new mongoose.Types.ObjectId(serviceId),
          serviceSnapshot,
          customerId: new mongoose.Types.ObjectId(user.id),
          date,
          startTime,
          endTime,
          status: "pending",
          paymentStatus: "pending",
          totalAmount,
        });

        const receipt = `book_${Date.now()}`.slice(0, 40);
        const order = await createRazorpayOrder({
          amount: amountPaise,
          receipt,
          notes: {
            type: "booking",
            appointmentId: appointment._id.toString(),
          },
        });

        return NextResponse.json({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          appointmentId: appointment._id.toString(),
        });
      } catch (err) {
        console.error("Booking create-order error:", err);
        return NextResponse.json(
          { error: err?.message ?? "Failed to create order" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}
