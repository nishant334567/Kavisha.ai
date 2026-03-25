"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2, Calendar } from "lucide-react";

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
      <div className="max-w-4xl mx-auto px-4 py-8 text-highlight">
        Loading…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-4xl bg-background px-4 py-8 text-foreground">
        <p className="mb-4 text-muted">Post not found.</p>
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs${qs}`)}
          className="inline-flex items-center gap-2 text-highlight hover:underline"
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
    <div className="mx-auto max-w-4xl bg-background px-4 py-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs${qs}`)}
          className="rounded-lg p-2 text-muted hover:bg-muted-bg hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/blogs/${post.slug}/edit${qs}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-highlight transition-colors hover:bg-muted-bg"
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

      <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {post.featuredImage && (
          <div className="aspect-video w-full bg-muted-bg">
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
            {publishedAt && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <Calendar className="w-3.5 h-3.5" />
                {publishedAt}
              </span>
            )}
            {updatedAt && (
              <span className="text-sm text-muted">Updated {updatedAt}</span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-2 text-lg text-muted">{post.excerpt}</p>
          )}
          <div
            className="prose prose-sm mt-6 max-w-none prose-headings:text-foreground prose-p:text-muted prose-strong:text-foreground prose-li:text-muted prose-a:text-highlight"
            dangerouslySetInnerHTML={{ __html: post.content || "" }}
          />
        </div>
      </article>
    </div>
  );
}
