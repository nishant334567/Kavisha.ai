import { client } from "@/app/lib/sanity";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const {
    brandName,
    loginButtonText,
    title,
    subtitle,
    email,
    removeAdmin,
    subdomain,
        services,
      } = await req.json();

      // Check if requester is admin for this brand
      const isAdmin = await isBrandAdmin(decodedToken.email, subdomain);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await client.fetch(
        `*[_type == "brand" && subdomain == "${subdomain}"][0]`
      );

      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      let updateData = {
        brandName,
        loginButtonText,
        title,
        subtitle,
      };

      // Handle admin operations
      if (removeAdmin) {
        // Remove admin from the array
        updateData.admins =
          brandData.admins?.filter((admin) => admin !== removeAdmin) || [];
      } else if (email && email.trim()) {
        // Add new admin (only if email is provided and not empty)
        const currentAdmins = brandData.admins || [];
        if (!currentAdmins.includes(email)) {
          updateData.admins = [...currentAdmins, email];
        }
      }

      // Handle services update
      if (services) {
        updateData.services = services;
      }

      const updatedBrandData = await client
        .patch(brandData._id)
        .set(updateData)
        .commit();

      return NextResponse.json(updatedBrandData);
    },
  });
}
