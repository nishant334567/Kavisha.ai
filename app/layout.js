import "./globals.css";
import { fontVariables } from "./lib/fonts";
import { headers } from "next/headers";
import { client, urlFor } from "./lib/sanity";
import ClientLayout from "./components/ClientLayout";

function trimText(str = "", max = 100) {
  if (!str?.trim()) return "";
  const trimmed = str.trim();
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

function getSubdomainFromHost(host) {
  const parts = host.split(".");
  return parts.length > 2 ? parts[0] : "kavisha";
}

function getImageUrl(imageAsset, fallback) {
  if (!imageAsset?.asset?._ref) return fallback;
  const url = urlFor(imageAsset).url();
  return url || fallback;
}

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdomain = getSubdomainFromHost(host);

  const brand = await client.fetch(
    `*[_type == "brand" && subdomain == $subdomain][0]{
      brandName,
      title,
      subtitle,
      brandImage,
      logo
    }`,
    { subdomain }
  );

  const brandTitle = brand?.brandName || brand?.title || subdomain;
  const pageTitle =
    subdomain === "kavisha" ? brandTitle : `${brandTitle} | Kavisha.ai`;
  const description = trimText(brand?.subtitle || "AI platform", 100);

  const siteUrl = `https://${host}`;
  const ogImage = getImageUrl(brand?.brandImage, "https://kavisha.ai/og-home.png");
  const favicon = getImageUrl(brand?.logo, getImageUrl(brand?.brandImage, "/favicon.ico"));

  return {
    title: pageTitle,
    description,
    metadataBase: new URL(siteUrl),
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: siteUrl,
      siteName: "Kavisha.ai",
      title: pageTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: pageTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [ogImage],
    },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head />
      <body
        className="h-full"
        suppressHydrationWarning={true}
        suppressContentEditableWarning={true}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
