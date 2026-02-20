import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/app/lib/unsubscribe-token";
import { connectDB } from "@/app/lib/db";
import EmailUnsubscribe from "@/app/models/EmailUnsubscribe";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, reason } = body || {};
    if (!token) {
      return NextResponse.json({ error: "Missing link. Please use the link from your email." }, { status: 400 });
    }
    const data = verifyUnsubscribeToken(token);
    if (!data) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    await connectDB();
    const email = data.email.toLowerCase();
    const brand = data.brand.toLowerCase();
    await EmailUnsubscribe.findOneAndUpdate(
      { brand, email },
      {
        email,
        brand,
        avatarId: data.avatarId,
        reason: reason && String(reason).trim() ? String(reason).trim() : null,
        unsubscribedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to unsubscribe", details: e.message },
      { status: 500 }
    );
  }
}
