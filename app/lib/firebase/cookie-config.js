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
  return {
    path: "/",
    httpOnly: true,
    secure: isProd || isStaging,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 24, // 12 days
    domain,
  };
}
