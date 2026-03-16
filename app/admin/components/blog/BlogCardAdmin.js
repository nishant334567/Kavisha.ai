"use client";

import Link from "next/link";
import { FileText, Pencil, Eye, Trash2, Calendar } from "lucide-react";

const TEAL = "#2D545E";

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

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && !deleting) onDelete(post);
  };

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-1 min-w-0 gap-4 p-4 sm:p-5">
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <FileText className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="font-bold text-lg text-gray-900 truncate">{title}</h2>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                status === "published"
                  ? "bg-green-100 text-green-800"
                  : status === "archived"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{excerpt}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
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
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </Link>
          <Link
            href={editHref}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
