import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Order from "@/app/models/Order";
import BookingAppointment from "@/app/models/BookingAppointment";
import Payment from "@/app/models/Payment";

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand")?.trim();
    const paymentBrandMatch = { $or: [{ brand }, { "metadata.brand": brand }] };

    if (!brand) {
      return NextResponse.json(
        { error: "Brand is required" },
        { status: 400 }
      );
    }

    const [productRevenue, serviceRevenue, communityRevenue] =
      await Promise.all([
        Order.aggregate([
          { $match: { brand, paymentStatus: "completed" } },
          {
            $group: {
              _id: "$productId",
              name: { $first: "$productSnapshot.name" },
              orders: { $sum: 1 },
              quantity: { $sum: { $ifNull: ["$quantity", 0] } },
              revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            },
          },
          { $sort: { revenue: -1, quantity: -1 } },
        ]),
        BookingAppointment.aggregate([
          { $match: { brand, paymentStatus: "completed" } },
          {
            $group: {
              _id: "$serviceId",
              title: { $first: "$serviceSnapshot.title" },
              bookings: { $sum: 1 },
              revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
            },
          },
          { $sort: { revenue: -1, bookings: -1 } },
        ]),
        Payment.aggregate([
          {
            $match: {
              type: "community_connect",
              ...paymentBrandMatch,
            },
          },
          {
            $group: {
              _id: "community_connect",
              payments: { $sum: 1 },
              revenuePaise: { $sum: { $ifNull: ["$amount", 0] } },
            },
          },
        ]),
      ]);

    const products = productRevenue.map((item) => ({
      id: item._id?.toString?.() || "",
      name: item.name || "Untitled product",
      orders: item.orders || 0,
      quantity: item.quantity || 0,
      revenue: roundCurrency(item.revenue),
    }));

    const services = serviceRevenue.map((item) => ({
      id: item._id?.toString?.() || "",
      name: item.title || "Untitled service",
      bookings: item.bookings || 0,
      revenue: roundCurrency(item.revenue),
    }));

    const community = communityRevenue.map((item) => ({
      id: item._id,
      name: "Community Connect",
      payments: item.payments || 0,
      revenue: roundCurrency((item.revenuePaise || 0) / 100),
    }));

    const totals = {
      products: roundCurrency(
        products.reduce((sum, item) => sum + item.revenue, 0)
      ),
      services: roundCurrency(
        services.reduce((sum, item) => sum + item.revenue, 0)
      ),
      community: roundCurrency(
        community.reduce((sum, item) => sum + item.revenue, 0)
      ),
    };

    return NextResponse.json({
      totals: {
        ...totals,
        overall: roundCurrency(
          totals.products + totals.services + totals.community
        ),
      },
      breakdown: {
        products,
        services,
        community,
      },
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue" },
      { status: 500 }
    );
  }
}
