import { NextResponse } from "next/server";
import { createClient } from "next-sanity";

const getSanityClient = () => {
  // During build time, use fallback values
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wkgir1xd";
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

  return createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN || "",
  });
};
export async function POST(req) {
  try {
    if (!process.env.SANITY_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Sanity API token not configured" },
        { status: 500 }
      );
    }

    const { email, brand } = await req.json();

    if (!email || !brand) {
      return NextResponse.json(
        { success: false, error: "Email and brand are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const client = getSanityClient();

    const brandData = await client.fetch(
      `*[_type=="brand" && subdomain=="${brand}"][0]`
    );

    if (!brandData) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const existingAdmins = brandData.admins || [];
    if (existingAdmins.includes(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: "Admin already exists" },
        { status: 400 }
      );
    }

    const updatedAdmins = [...existingAdmins, trimmedEmail];

    await client.patch(brandData._id).set({ admins: updatedAdmins }).commit();

    // Send welcome email to new admin
    try {
      const emailResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/admin/send-bulk-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: [
              {
                email: trimmedEmail,
                name: trimmedEmail.split("@")[0],
              },
            ],
            subject: `Welcome! You've been added as an admin for ${brandData.brandName || brand.toUpperCase()}`,
            body: `Hello!\n\nCongratulations! You have been added as an admin for ${brandData.brandName || brand.toUpperCase()}.\n\nYou now have access to the admin dashboard where you can:\n• View and manage user sessions\n• Send emails to users\n• Update session statuses\n• Add comments to sessions\n• Assign sessions to team members\n\nPlease log in to access your admin privileges.\n\nBest regards,\nThe ${brandData.brandName || brand.toUpperCase()} Team`,
            brand: brand,
          }),
        }
      );

      if (!emailResponse.ok) {
        console.warn(
          "Failed to send admin notification email, but admin was added successfully"
        );
      }
    } catch (emailError) {
      console.warn("Email notification failed:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add admin" },
      { status: 500 }
    );
  }
}
