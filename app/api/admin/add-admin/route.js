import { NextResponse } from "next/server";
import { client } from "@/app/lib/sanity";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
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

        // Check if requester is admin for this brand
        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const trimmedEmail = email.trim().toLowerCase();

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

        await client
          .patch(brandData._id)
          .set({ admins: updatedAdmins })
          .commit();

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
        } catch (emailError) {}

        return NextResponse.json({ success: true });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: "Failed to add admin" },
          { status: 500 }
        );
      }
    },
  });
}
