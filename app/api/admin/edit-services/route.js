import { client } from "@/app/lib/sanity";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { brandName, serviceData } = await req.json();

      // Check if requester is admin for this brand
      const isAdmin = await isBrandAdmin(decodedToken.email, brandName);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await client.fetch(
        `*[_type == "brand" && subdomain == "${brandName}"][0]`
      );

      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      // Add new service to the array
      const services = brandData.services || [];
      // Add _key property for Sanity array items (required for editing)
      const serviceWithKey = {
        ...serviceData,
        _key: Math.random().toString(36).substring(2, 15),
      };
      const updatedServices = [...services, serviceWithKey];

      const updatedBrand = await client
        .patch(brandData._id)
        .set({
          services: updatedServices,
        })
        .commit();

      return NextResponse.json(updatedBrand);
    },
  });
}

export async function PATCH(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { brandName, serviceName, serviceData, serviceKey } = await req.json();

      // Check if requester is admin for this brand
      const isAdmin = await isBrandAdmin(decodedToken.email, brandName);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await client.fetch(
        `*[_type == "brand" && subdomain == "${brandName}"][0]`
      );

      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const services = brandData.services || [];
      const index =
        serviceKey != null
          ? services.findIndex((s) => s._key === serviceKey)
          : services.findIndex((s) => s.name === serviceName);

      if (index === -1) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      const updatedServices = [...services];
      // Preserve existing _key if it exists, otherwise generate a new one
      const existingKey = updatedServices[index]._key;
      updatedServices[index] = {
        ...updatedServices[index],
        ...serviceData,
        _key: existingKey || Math.random().toString(36).substring(2, 15),
      };

      const updateBrand = await client
        .patch(brandData._id)
        .set({ services: updatedServices })
        .commit();

      return NextResponse.json(updateBrand);
    },
  });
}

export async function DELETE(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { brandName, serviceName, serviceKey } = await req.json();

      if (!brandName || (serviceKey == null && !serviceName)) {
        return NextResponse.json(
          { error: "brandName and (serviceKey or serviceName) are required" },
          { status: 400 }
        );
      }

      const isAdmin = await isBrandAdmin(decodedToken.email, brandName);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden - not a brand admin" },
          { status: 403 }
        );
      }

      const brandData = await client.fetch(
        `*[_type == "brand" && subdomain == "${brandName}"][0]`
      );
      if (!brandData) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      const services = brandData.services || [];
      let updatedServices;
      if (serviceKey != null) {
        updatedServices = services.filter((s) => s._key !== serviceKey);
      } else {
        const idx = services.findIndex((s) => s.name === serviceName);
        if (idx === -1) {
          return NextResponse.json(
            { error: "Service not found" },
            { status: 404 }
          );
        }
        updatedServices = services.filter((_, i) => i !== idx);
      }

      if (updatedServices.length === services.length) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      const updated = await client
        .patch(brandData._id)
        .set({ services: updatedServices })
        .commit();

      return NextResponse.json(updated);
    },
  });
}
