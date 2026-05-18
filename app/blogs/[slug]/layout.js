import { headers } from "next/headers";
import { connectDB } from "@/app/lib/db";
import BlogPost from "@/app/models/BlogPost";
import { subdomainFromHost } from "@/app/lib/kavishaSiteEnv";

function trimText(str = "", max = 160) {
  if (!str?.trim()) return "";
  const trimmed = str.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const brand = subdomainFromHost(host);

  try {
    await connectDB();
    const now = new Date();
    const post = await BlogPost.findOne({
      brand,
      slug: String(slug).trim(),
      status: "published",
      $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
    })
      .select("title excerpt metaTitle metaDescription featuredImage")
      .lean();

    if (!post) {
      return {
        title: "Post not found",
        openGraph: { images: [] },
        twitter: { images: [] },
      };
    }

    const title = post.metaTitle?.trim() || post.title || "Blog post";
    const description = trimText(
      post.metaDescription?.trim() || post.excerpt || post.title,
      160
    );
    const siteUrl = `https://${host}`;
    const path = `/blogs/${encodeURIComponent(slug)}`;
    const canonicalUrl =
      brand && brand !== "kavisha"
        ? `${siteUrl}${path}?subdomain=${encodeURIComponent(brand)}`
        : `${siteUrl}${path}`;
    let ogImage = post.featuredImage?.trim() || null;
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
        type: "article",
        locale: "en_US",
        url: canonicalUrl,
        title,
        description,
        siteName: "Kavisha.ai",
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
      title: "Blog post",
      openGraph: { images: [] },
      twitter: { images: [] },
    };
  }
}

export default function BlogPostLayout({ children }) {
  return <>{children}</>;
}
