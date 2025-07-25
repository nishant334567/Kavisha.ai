import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:3000`;
    const state = Math.random().toString(36).substring(7);
    const linkedinAuthUrl =
      `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(baseUrl + "/api/linkedin/callback")}&` +
      `scope=openid profile email&` +
      `state=${state}`;
    return NextResponse.json({ authUrl: linkedinAuthUrl });
  } catch (error) {
    console.error("Error generating linkedin url:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
