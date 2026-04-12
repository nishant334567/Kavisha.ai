import { createHmac, timingSafeEqual } from "node:crypto";

function base64UrlToBuffer(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 =
    s.replace(/-/g, "+").replace(/_/g, "/") + (pad ? "=".repeat(pad) : "");
  return Buffer.from(b64, "base64");
}

/**
 * Verify HS256 JWT and return payload. Checks exp, optional iss/aud.
 * @param {string} token
 * @param {string} secret
 * @param {{ expectedIss?: string, expectedAud?: string }} [options]
 */
export function verifyWidgetSsoJwt(token, secret, options = {}) {
  const parts = String(token).split(".");
  if (parts.length !== 3) {
    const err = new Error("Invalid JWT format");
    err.code = "invalid_format";
    throw err;
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();

  let sig;
  try {
    sig = base64UrlToBuffer(sigB64);
  } catch {
    const err = new Error("Invalid signature encoding");
    err.code = "bad_sig";
    throw err;
  }

  if (
    sig.length !== expectedSig.length ||
    !timingSafeEqual(sig, expectedSig)
  ) {
    const err = new Error("Invalid signature");
    err.code = "bad_sig";
    throw err;
  }

  let header;
  try {
    header = JSON.parse(base64UrlToBuffer(headerB64).toString("utf8"));
  } catch {
    const err = new Error("Invalid JWT header");
    err.code = "invalid_header";
    throw err;
  }

  if (header.alg !== "HS256") {
    const err = new Error("Unexpected algorithm");
    err.code = "bad_alg";
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8"));
  } catch {
    const err = new Error("Invalid JWT payload");
    err.code = "invalid_payload";
    throw err;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    const err = new Error("Token expired");
    err.code = "expired";
    throw err;
  }

  if (
    options.expectedIss != null &&
    options.expectedIss !== "" &&
    payload.iss !== options.expectedIss
  ) {
    const err = new Error("Invalid iss");
    err.code = "bad_iss";
    throw err;
  }

  if (
    options.expectedAud != null &&
    options.expectedAud !== "" &&
    payload.aud !== options.expectedAud
  ) {
    const err = new Error("Invalid aud");
    err.code = "bad_aud";
    throw err;
  }

  return payload;
}
