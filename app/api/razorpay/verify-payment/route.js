import { NextResponse } from "next/server";
import crypto from "crypto";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import Payment from "@/app/models/Payment";
import User from "@/app/models/Users";
import Order from "@/app/models/Order";
import Cart from "@/app/models/Cart";
import Product from "@/app/models/Product";
import BookingAppointment from "@/app/models/BookingAppointment";
import mongoose from "mongoose";
import { sendEmail } from "@/app/lib/email";
import {
  getBookingInviteRecipients,
  sendBookingCalendarInvite,
} from "@/app/lib/booking-invite-email";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await request.json();
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          userId: payerUserId,
          type = "community_connect",
          metadata = {},
          amount,
          currency = "INR",
        } = body ?? {};
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return NextResponse.json(
            { success: false, error: "Missing payment details" },
            { status: 400 },
          );
        }
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
          return NextResponse.json(
            { success: false, error: "Razorpay not configured" },
            { status: 500 },
          );
        }
        const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
          .createHmac("sha256", secret)
          .update(payload)
          .digest("hex");
        if (expectedSignature !== razorpay_signature) {
          return NextResponse.json({ success: false });
        }

        await connectDB();
        const existing = await Payment.findOne({
          razorpayPaymentId: razorpay_payment_id,
        }).lean();
        if (existing) {
          return NextResponse.json({
            success: false,
            error: "Payment already used",
          });
        }

        if (!payerUserId) {
          return NextResponse.json(
            { success: false, error: "userId required" },
            { status: 400 },
          );
        }

        const currentUser = await getUserFromDB(decodedToken?.email);
        if (!currentUser || String(currentUser.id) !== String(payerUserId)) {
          return NextResponse.json(
            { success: false, error: "Payer must be the authenticated user" },
            { status: 403 },
          );
        }

        await Payment.create({
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          payerUserId,
          amount: amount != null ? amount : 2000,
          currency,
          type,
          metadata,
        });

        if (type === "community_connect" && metadata?.targetUserId) {
          const [targetUser, payerUser] = await Promise.all([
            User.findById(metadata.targetUserId).select("email name").lean(),
            User.findById(payerUserId).select("name").lean(),
          ]);
          const to = targetUser?.email;
          const connectorName = payerUser?.name || "Someone";
          if (to) {
            sendEmail({
              to,
              from: "Kavisha <hello@kavisha.ai>",
              subject: "New connection in your community",
              body: `<p>Hi ${targetUser?.name || "there"},</p><p>${connectorName} connected you from community.</p><p>Go to your inbox to see the conversation.</p>`,
            }).catch((e) =>
              console.error("Community connection email failed:", e),
            );
          }
        }

        if (type === "product_order") {
          const {
            brand,
            cartItems = [],
            shippingPhone = "",
            shippingAddress = "",
          } = metadata;
          if (!brand || !Array.isArray(cartItems) || cartItems.length === 0) {
            return NextResponse.json(
              { success: false, error: "Invalid product order metadata" },
              { status: 400 },
            );
          }
          const productIds = cartItems.map((i) => i.productId).filter(Boolean);
          const products = await Product.find({
            _id: { $in: productIds },
          }).lean();
          const productMap = Object.fromEntries(
            products.map((p) => [String(p._id), p]),
          );
          const orderGroupId = `ord_${Date.now()}`;

          for (const item of cartItems) {
            const productId = item.productId;
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const priceSnapshot = Number(item.priceSnapshot) || 0;
            const totalAmount = priceSnapshot * quantity;
            const product = productMap[String(productId)];

            await Order.create({
              brand,
              orderId: orderGroupId,
              productId,
              productSnapshot: product
                ? {
                    name: product.name || "",
                    description: product.description || "",
                    price: product.price || 0,
                    discountPercentage: product.discountPercentage || 0,
                    images: product.images || [],
                  }
                : {
                    name: "",
                    description: "",
                    price: 0,
                    discountPercentage: 0,
                    images: [],
                  },
              customerId: payerUserId,
              shippingPhone,
              shippingAddress,
              orderStatus: "pending",
              paymentStatus: "completed",
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              quantity,
              totalAmount,
            });
          }

          await Cart.findOneAndUpdate(
            { userId: payerUserId, brand },
            { $set: { items: [] } },
          );
        }

        if (type === "booking") {
          const appointmentId = metadata?.appointmentId;
          if (!appointmentId) {
            return NextResponse.json(
              { success: false, error: "Missing appointmentId" },
              { status: 400 },
            );
          }
          const appointment = await BookingAppointment.findOne({
            _id: new mongoose.Types.ObjectId(appointmentId),
            paymentStatus: "pending",
          });
          if (!appointment) {
            return NextResponse.json(
              {
                success: false,
                error: "Appointment not found or already paid",
              },
              { status: 400 },
            );
          }
          if (String(appointment.customerId) !== String(payerUserId)) {
            return NextResponse.json(
              { success: false, error: "Appointment does not belong to payer" },
              { status: 403 },
            );
          }
          await BookingAppointment.updateOne(
            { _id: appointment._id },
            {
              $set: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                paymentStatus: "completed",
                status: "confirmed",
              },
            },
          );

          await getBookingInviteRecipients(appointment)
            .then(({ customerEmail, customerName, adminEmails }) =>
              sendBookingCalendarInvite(
                appointment,
                { email: customerEmail, name: customerName },
                adminEmails,
              ),
            )
            .catch((e) => console.error("Booking calendar invite failed:", e));
        }

        return NextResponse.json({ success: true });
      } catch (err) {
        console.error("Razorpay verify-payment error:", err);
        return NextResponse.json(
          { success: false, error: err?.message ?? "Verification failed" },
          { status: 500 },
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      ),
  });
}
