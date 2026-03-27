// Shared cookie configuration for auth
const ROOT_DOMAIN = "kavisha.ai";

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const isStaging = process.env.NODE_ENV === "staging";
  const domain = isStaging
    ? ".staging.kavisha.ai"
    : isProd
      ? `.${ROOT_DOMAIN}`
      : undefined;
  const secure = isProd || isStaging;
  // Lax blocks the session cookie in a third-party iframe (embed widget on a client's site).
  // None + Secure is required for cross-site iframe; dev stays Lax without Secure.
  const sameSite = secure ? "none" : "lax";

  return {
    path: "/",
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 12 * 60 * 60 * 24, // 12 days
    domain,
  };
}
