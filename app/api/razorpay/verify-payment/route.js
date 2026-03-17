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
import { createDownloadToken } from "@/app/lib/download-token";
import {
  getBookingInviteRecipients,
  sendBookingCalendarInvite,
} from "@/app/lib/booking-invite-email";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

const DIGITAL_DOWNLOAD_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

          // Send digital download email for any digital products in the order
          const digitalProductIds = [...new Set(cartItems.map((i) => i.productId).filter(Boolean))];
          const digitalProducts = digitalProductIds
            .map((id) => productMap[String(id)])
            .filter(
              (p) =>
                p &&
                Array.isArray(p.digitalFiles) &&
                p.digitalFiles.length > 0 &&
                p.digitalFiles.some((f) => f && f.gcsPath)
            );

          if (digitalProducts.length > 0) {
            const customer = await User.findById(payerUserId).select("email name").lean();
            const to = customer?.email || currentUser?.email;
            const customerName = customer?.name || currentUser?.name || "there";
            const fromName = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "Kavisha";
            const from = `${fromName} <hello@kavisha.ai>`;

            if (!to) {
              console.error("Digital download email skipped: no recipient email (userId:", payerUserId, ")");
            } else {
              const linkLines = [];
              const expiresAtMs = Date.now() + DIGITAL_DOWNLOAD_LINK_EXPIRY_MS;
              for (const product of digitalProducts) {
                linkLines.push(`<p style="margin:16px 0 8px;font-weight:600;">${escapeHtml(product.name || "Product")}</p>`);
                for (const file of product.digitalFiles) {
                  if (!file?.gcsPath) continue;
                  const token = createDownloadToken({
                    gcsPath: file.gcsPath,
                    filename: file.filename || "download",
                    expiresAtMs,
                  });
                  const downloadUrl = `${BASE_URL}/api/download-digital-file?token=${encodeURIComponent(token)}`;
                  linkLines.push(
                    `<p style="margin:4px 0;"><a href="${escapeHtml(downloadUrl)}" style="color:#004A4E;text-decoration:underline;">${escapeHtml(file.filename || "Download")}</a> (link valid 7 days)</p>`
                  );
                }
              }
              const html = `
                <p>Hi ${escapeHtml(customerName)},</p>
                <p>Thanks for your purchase. Click the links below to download your files:</p>
                ${linkLines.join("")}
                <p style="margin-top:24px;font-size:12px;color:#6b7280;">If you have any issues, reply to this email.</p>
              `;
              const emailResult = await sendEmail({
                to,
                from,
                subject: "Your download links",
                body: html,
              });
              if (!emailResult?.ok) {
                console.error("Digital download email failed:", emailResult?.error);
              }
            }
          }
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
