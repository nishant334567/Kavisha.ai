import crypto from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET || "kavisha-unsubscribe-fallback";

/** Create signed token for unsubscribe link. Use lowercase brand/email for consistent DB lookups. */
export function createUnsubscribeToken({ email, brand, avatarId = null }) {
  const payload = JSON.stringify({
    email: String(email).trim().toLowerCase(),
    brand: String(brand).trim().toLowerCase(),
    avatarId: avatarId == null ? null : String(avatarId),
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sign = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return b64 + "." + sign;
}

/** Verify token and return { email, brand, avatarId } or null. */
export function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sign = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  if (expected !== sign) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    return payload.email && payload.brand
      ? { email: payload.email, brand: payload.brand, avatarId: payload.avatarId ?? null }
      : null;
  } catch {
    return null;
  }
}
