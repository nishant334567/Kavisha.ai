"use client";

import { useState, useCallback } from "react";
import { Link2, MoreVertical } from "lucide-react";
import ShareButtons from "./ShareButtons";
import ShareAsEmailButton from "./ShareAsEmailButton";

function getReadTimeMinutes(html) {
  if (!html || typeof html !== "string") return 0;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function getRelativeUpdated(updatedAt, publishedAt) {
  if (!updatedAt) return null;
  const updated = new Date(updatedAt).getTime();
  const published = publishedAt ? new Date(publishedAt).getTime() : 0;
  if (published && updated - published < 60 * 60 * 1000) return null; // same day/hour
  const now = Date.now();
  const days = Math.floor((now - updated) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated: ${days} days ago`;
  if (days < 30) return `Updated: ${Math.floor(days / 7)} weeks ago`;
  return `Updated: ${Math.floor(days / 30)} months ago`;
}

export default function BlogPostContent({ post, brand, brandName, brandImageUrl }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCopyLink = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setMenuOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  if (!post) return null;

  const title = post.title || "Untitled";
  const authorName = post.author?.trim() || brandName || "Author";
  const authorInitial = authorName[0].toUpperCase();
  const avatarUrl = brandImageUrl || null;
  const publishDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const readTime = getReadTimeMinutes(post.content);
  const content = post.content || "";
  const imageUrl = post.featuredImage || null;
  const excerpt = post.excerpt?.trim() || "";
  const updatedLabel = getRelativeUpdated(post.updatedAt, post.publishedAt);

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-medium text-gray-600">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              authorInitial
            )}
          </div>
          <span className="font-medium text-gray-900">{authorName}</span>
          {publishDate && (
            <>
              <span className="text-gray-400" aria-hidden>
                ·
              </span>
              <span>{publishDate}</span>
            </>
          )}
          <span className="text-gray-400" aria-hidden>
            ·
          </span>
          <span>{readTime} min read</span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="More options"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Link2 className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-bold text-gray-900 md:text-4xl">
        {title}
      </h1>

      {updatedLabel && (
        <p className="mt-2 text-sm text-gray-500">{updatedLabel}</p>
      )}

      {excerpt && (
        <p className="mt-3 text-lg leading-relaxed text-gray-600">{excerpt}</p>
      )}

      <div
        className="prose prose-gray mt-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center gap-4">
        <ShareButtons
          url={typeof window !== "undefined" ? window.location.href : ""}
          title={title}
          text={excerpt || title}
          variant="row"
        />
        {brand && (
          <ShareAsEmailButton
            slug={post.slug || post._id}
            brand={brand}
            title={title}
            variant="row"
          />
        )}
      </div>
    </article>
  );
}
