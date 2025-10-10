import { client } from "@/app/lib/sanity";
import { NextResponse } from "next/server";

export async function POST(req) {
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
}
