"use client";

import Link from "next/link";
import { FileText, Pencil, Eye, Trash2, Calendar } from "lucide-react";
import ShareButtons from "@/app/components/blog/ShareButtons";
import ShareAsEmailButton from "@/app/components/blog/ShareAsEmailButton";

export default function BlogCardAdmin({
  post,
  brand,
  onDelete,
  deleting = false,
}) {
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const slug = post?.slug || post?._id;
  const viewHref = `/admin/blogs/${encodeURIComponent(slug)}${qs}`;
  const editHref = `/admin/blogs/${encodeURIComponent(slug)}/edit${qs}`;

  const title = post?.title || "Untitled";
  const excerpt =
    post?.excerpt ||
    (post?.content
      ? String(post.content).replace(/<[^>]+>/g, "").slice(0, 140) + "…"
      : "No excerpt");
  const status = post?.status || "draft";
  const publishedAt = post?.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString()
    : null;
  const updatedAt = post?.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString()
    : null;
  const imageUrl = post?.featuredImage || null;

  const getBlogShareUrl = () => {
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
    return `${base}/blogs/${encodeURIComponent(slug)}${qs}`;
  };
  const shareUrl = getBlogShareUrl();

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && !deleting) onDelete(post);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 min-w-0 gap-4 p-4 sm:p-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted-bg sm:h-28 sm:w-28">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <FileText className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="truncate text-lg font-bold text-foreground">{title}</h2>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "published"
                  ? "bg-green-100 text-green-800"
                  : status === "archived"
                    ? "bg-muted-bg text-muted"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{excerpt}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            {publishedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {publishedAt}
              </span>
            )}
            {updatedAt && <span>Updated {updatedAt}</span>}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2 min-w-[120px]">
          <Link
            href={viewHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-bg"
          >
            <Eye className="w-4 h-4" />
            View
          </Link>
          <Link
            href={editHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
      {shareUrl && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <ShareButtons
            url={shareUrl}
            title={title}
            text={excerpt}
            variant="row"
          />
          {brand && (
            <ShareAsEmailButton
              slug={slug}
              brand={brand}
              title={title}
              variant="row"
            />
          )}
        </div>
      )}
    </article>
  );
}
