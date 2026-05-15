import { headers } from "next/headers";
import { connectDB } from "@/app/lib/db";
import BookingService from "@/app/models/BookingService";
import { subdomainFromHost } from "@/app/lib/kavishaSiteEnv";

function trimText(str = "", max = 160) {
  if (!str?.trim()) return "";
  const trimmed = str.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const brand = subdomainFromHost(host);

  try {
    await connectDB();
    const service = await BookingService.findOne({
      _id: id,
      brand,
    })
      .select("title subtitle description image")
      .lean();

    if (!service) {
      return {
        title: "Service not found",
        openGraph: { images: [] },
        twitter: { images: [] },
      };
    }

    const title = service.title?.trim() || "Booking service";
    const description = trimText(
      service.subtitle?.trim() || service.description?.trim() || title,
      160
    );
    const siteUrl = `https://${host}`;
    const path = `/services/${encodeURIComponent(id)}`;
    const canonicalUrl =
      brand && brand !== "kavisha"
        ? `${siteUrl}${path}?subdomain=${encodeURIComponent(brand)}`
        : `${siteUrl}${path}`;

    let ogImage = service.image?.trim() || null;
    if (ogImage && ogImage.startsWith("/")) {
      ogImage = `${siteUrl}${ogImage}`;
    }
    const ogImages = ogImage
      ? [{ url: ogImage, width: 1200, height: 630, alt: title }]
      : [];

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        type: "website",
        locale: "en_US",
        url: canonicalUrl,
        siteName: "Kavisha.ai",
        title,
        description,
        images: ogImages,
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch (e) {
    return {
      title: "Service",
      openGraph: { images: [] },
      twitter: { images: [] },
    };
  }
}

export default function ServiceDetailLayout({ children }) {
  return <>{children}</>;
}
