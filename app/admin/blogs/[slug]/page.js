"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2, Calendar } from "lucide-react";

const TEAL = "#2D545E";

export default function AdminBlogViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const slug = params?.slug;
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug || !brand) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/blogs/${encodeURIComponent(slug)}?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.post) setPost(data.post);
          else setPost(null);
        }
      } catch {
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, brand]);

  const handleDelete = async () => {
    if (!post || !confirm(`Delete "${post.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/blogs/${encodeURIComponent(post.slug)}?brand=${encodeURIComponent(brand)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        router.push(brand ? `/admin/blogs?subdomain=${encodeURIComponent(brand)}` : "/admin/blogs");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-[#2D545E]">
        Loading…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600 mb-4">Post not found.</p>
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs${qs}`)}
          className="inline-flex items-center gap-2 text-[#2D545E] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to blogs
        </button>
      </div>
    );
  }

  const status = post.status || "draft";
  const publishedAt = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString()
    : null;
  const updatedAt = post.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString()
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs${qs}`)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/blogs/${post.slug}/edit${qs}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-[#2D545E]/10 transition-colors"
            style={{ borderColor: TEAL, color: TEAL, backgroundColor: `${TEAL}0D` }}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {post.featuredImage && (
          <div className="aspect-video w-full bg-gray-100">
            <img
              src={post.featuredImage}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-2">
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
            {publishedAt && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {publishedAt}
              </span>
            )}
            {updatedAt && (
              <span className="text-sm text-gray-500">Updated {updatedAt}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{post.title}</h1>
          {post.excerpt && (
            <p className="text-lg text-gray-600 mt-2">{post.excerpt}</p>
          )}
          <div
            className="prose prose-gray max-w-none mt-6"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />
        </div>
      </article>
    </div>
  );
}
