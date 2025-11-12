// Shared cookie configuration for auth
const ROOT_DOMAIN = "kavisha.ai";

export function getCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 24, // 12 days
    domain:
      process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined,
  };
}
