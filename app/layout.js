import "./globals.css";
import { fontVariables } from "./lib/fonts";
import { headers } from "next/headers";
import { getBrandBySubdomain } from "./lib/brandRepository";
import { resolveBrandImageUrl } from "./lib/brandImageUrl";
import ClientLayout from "./components/ClientLayout";
import Script from "next/script";
import { subdomainFromHost } from "./lib/kavishaSiteEnv";

function trimText(str = "", max = 100) {
  if (!str?.trim()) return "";
  const trimmed = str.trim();
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

export async function generateMetadata() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdomain = subdomainFromHost(host);

  const brand = await getBrandBySubdomain(subdomain);

  const brandTitle = brand?.brandName || brand?.title || subdomain;
  const pageTitle =
    subdomain === "kavisha" ? brandTitle : `${brandTitle} | Kavisha.ai`;
  const description = trimText(brand?.subtitle || "AI platform", 100);

  const siteUrl = host
    ? `http${host.includes("localhost") ? "" : "s"}://${host}`
    : "https://kavisha.ai";
  let metadataBase;
  try {
    metadataBase = new URL(siteUrl);
  } catch {
    metadataBase = new URL("https://kavisha.ai");
  }
  const ogImage =
    (await resolveBrandImageUrl(brand?.brandImageUrl)) ||
    "https://kavisha.ai/og-home.png";
  const favicon =
    (await resolveBrandImageUrl(brand?.logoUrl)) ||
    (await resolveBrandImageUrl(brand?.brandImageUrl)) ||
    "/favicon.ico";

  return {
    title: pageTitle,
    description,
    metadataBase,
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

export default async function RootLayout({ children }) {
  const h = ((await headers()).get("host") || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k="kavisha-chunk-retries";function isChunk(m){return/ChunkLoadError|Loading chunk .* failed/i.test(m||"")}function retry(r){if(!(r instanceof Error))return;var m=r.message||"";if(!isChunk(m))return;var n=parseInt(sessionStorage.getItem(k)||"0",10);if(n>=2){sessionStorage.removeItem(k);return}sessionStorage.setItem(k,String(n+1));var u=new URL(location.href);u.searchParams.set("_chunk",Date.now());location.replace(u.toString())}window.addEventListener("load",function(){sessionStorage.removeItem(k)});window.addEventListener("error",function(e){if(e.target&&e.target!==window)return;retry(e.error)});window.addEventListener("unhandledrejection",function(e){retry(e.reason)})})();`,
          }}
        />
      </head>
      <body
        className="h-full"
        suppressHydrationWarning={true}
        suppressContentEditableWarning={true}
      >
        <ClientLayout>{children}</ClientLayout>
        {h === "kavisha.ai" && (
          <Script
            src="/embed.js"
            strategy="afterInteractive"
            data-brand="kavisha"
          />
        )}
      </body>
    </html>
  );
}
