import crypto from "crypto";

const SECRET = process.env.DOWNLOAD_TOKEN_SECRET || process.env.UNSUBSCRIBE_SECRET || "kavisha-download-fallback";

/**
 * Create a signed token for a digital product download link.
 * Payload: { gcsPath, filename, exp } (exp = expiry timestamp in ms).
 */
export function createDownloadToken({ gcsPath, filename, expiresAtMs }) {
  const payload = JSON.stringify({
    gcsPath: String(gcsPath),
    filename: String(filename || "download"),
    exp: Number(expiresAtMs),
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sign = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  return b64 + "." + sign;
}

/**
 * Verify token and return { gcsPath, filename } or null if invalid/expired.
 */
export function verifyDownloadToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const b64 = token.slice(0, dot);
  const sign = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("hex");
  if (expected !== sign) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!payload.gcsPath || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return {
      gcsPath: payload.gcsPath,
      filename: payload.filename || "download",
    };
  } catch {
    return null;
  }
}
