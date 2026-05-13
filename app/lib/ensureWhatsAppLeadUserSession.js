import { connectDB } from "./db.js";
import User from "../models/Users.js";
import Session from "../models/ChatSessions.js";
import { createSessionWithDefaultLog } from "./createSessionWithDefaultLog.js";

export async function ensureWhatsAppLeadUserSession(waId, opts = {}) {
  const brand = process.env.WHATSAPP_LEAD_BRAND?.trim();
  const serviceKey = process.env.WHATSAPP_LEAD_SERVICE_KEY?.trim();
  if (!brand || !serviceKey) return null;

  const digits = String(waId || "").replace(/\D/g, "");
  if (!digits) return null;

  const email = `wa.${digits}@wa.kavisha.ai`;
  const displayName = String(opts.displayName || "").trim().slice(0, 120);

  await connectDB();

  let user = await User.findOne({ email }).lean();
  if (!user) {
    try {
      user = (await User.create({
        name: displayName || "WhatsApp",
        email,
        phone: digits,
      })).toObject();
    } catch (e) {
      if (e?.code !== 11000) throw e;
      user = await User.findOne({ email }).lean();
    }
  }
  if (!user?._id) return null;

  const patch = { phone: digits };
  if (displayName) patch.name = displayName;
  if (
    String(user.phone || "") !== digits ||
    (displayName && user.name !== displayName)
  ) {
    await User.updateOne({ _id: user._id }, { $set: patch });
    user = { ...user, ...patch };
  }

  let session = await Session.findOne({
    userId: user._id,
    brand,
    role: "lead_journey",
    serviceKey,
  })
    .select("_id")
    .lean();

  if (!session) {
    const newSession = await createSessionWithDefaultLog(
      user._id,
      "lead_journey",
      brand,
      null,
      false,
      "WhatsApp",
      serviceKey,
      {}
    );
    session = { _id: newSession._id };
  }

  const id = String(user._id);
  return {
    userId: id,
    sessionId: String(session._id),
    user: { id, name: String(user.name || "WhatsApp") },
  };
}
