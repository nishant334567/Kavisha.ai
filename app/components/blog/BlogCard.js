"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Calendar, Share2 } from "lucide-react";
import ShareButtons from "./ShareButtons";
import ShareAsEmailButton from "./ShareAsEmailButton";

export default function BlogCard({ post, brand }) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareOpen]);

  if (!post) return null;

  const slug = post.slug || post._id;
  const href = brand
    ? `/blogs/${encodeURIComponent(slug)}?subdomain=${encodeURIComponent(brand)}`
    : `/blogs/${encodeURIComponent(slug)}`;
  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
  const title = post.title || "Untitled";
  const excerpt =
    post.excerpt ||
    (post.content
      ? String(post.content).replace(/<[^>]+>/g, "").slice(0, 140) + "…"
      : "");
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const imageUrl = post.featuredImage || null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="flex flex-col flex-1 min-h-0">
        {imageUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-muted-bg">
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="aspect-video w-full bg-muted-bg" />
        )}
        <div className="flex flex-1 flex-col p-4">
          <h2 className="font-semibold text-foreground line-clamp-2 group-hover:text-[#2D545E]">
            {title}
          </h2>
          {excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{excerpt}</p>
          ) : null}
          {date ? (
            <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="absolute top-2 right-2 z-10" ref={shareRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShareOpen((o) => !o);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted shadow-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Share"
          aria-expanded={shareOpen}
        >
          <Share2 className="h-4 w-4" />
        </button>
        {shareOpen && (
          <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg z-20">
            <ShareButtons
              url={fullUrl}
              title={title}
              text={excerpt}
              variant="dropdown"
            />
            {brand && (
              <ShareAsEmailButton
                slug={slug}
                brand={brand}
                title={title}
                variant="dropdown"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
