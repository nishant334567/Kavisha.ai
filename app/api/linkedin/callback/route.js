import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial or errors from LinkedIn
    if (error) {
      console.error("LinkedIn OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/?error=linkedin_${error}`, request.url)
      );
    }

    // Verify required parameters
    if (!code || !state) {
      console.error("Missing code or state parameter");
      return NextResponse.redirect(
        new URL("/?error=linkedin_invalid_params", request.url)
      );
    }

    // Verify user is authenticated
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      console.error("User not authenticated during LinkedIn callback");
      return NextResponse.redirect(
        new URL("/login?error=authentication_required", request.url)
      );
    }

    // Exchange authorization code for access token
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: `${baseUrl}/api/linkedin/callback`,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("LinkedIn token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/?error=linkedin_token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, expires_in } = tokens;

    // Fetch LinkedIn profile data
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!profileResponse.ok) {
      console.error("Failed to fetch LinkedIn profile");
      return NextResponse.redirect(
        new URL("/?error=linkedin_profile_fetch_failed", request.url)
      );
    }

    const profileData = await profileResponse.json();

    // Update user with LinkedIn data
    await connectDB();

    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

    const updatedUser = await User.findByIdAndUpdate(
      token.id,
      {
        linkedinConnected: true,
        linkedinProfile: {
          id: profileData.sub,
          firstName: profileData.given_name || "",
          lastName: profileData.family_name || "",
          profilePicture: profileData.picture || "",
          email: profileData.email || "",
          name: profileData.name || "",
        },
        linkedinAccessToken: access_token,
        linkedinTokenExpiry: expiryDate,
      },
      { new: true }
    );

    if (!updatedUser) {
      console.error("Failed to update user with LinkedIn data");
      return NextResponse.redirect(
        new URL("/?error=user_update_failed", request.url)
      );
    }

    ("LinkedIn connected successfully for user:", token.id);

    // Redirect to success page or dashboard
    return NextResponse.redirect(
      new URL("/?success=linkedin_connected", request.url)
    );
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=linkedin_callback_error", request.url)
    );
  }
}
