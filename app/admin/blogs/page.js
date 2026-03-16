"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, Plus } from "lucide-react";
import { BlogCardAdmin } from "@/app/admin/components/blog";

export default function AdminBlogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState(null);

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  useEffect(() => {
    if (!brand) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/blogs?brand=${encodeURIComponent(brand)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        setPosts(res.ok ? (data.posts ?? []) : []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  const handleDelete = async (post) => {
    if (!confirm(`Delete "${post.title}"?`)) return;
    const slug = post.slug || post._id;
    setDeletingSlug(slug);
    try {
      const res = await fetch(
        `/api/admin/blogs/${encodeURIComponent(slug)}?brand=${encodeURIComponent(brand)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) setPosts((prev) => prev.filter((p) => (p.slug || p._id) !== slug));
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
      }
    } finally {
      setDeletingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-[#2D545E]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-[#2D545E]/10 text-[#2D545E]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Blogs</h1>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/admin/blogs/add-new${qs}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D545E] text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New post
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-sm">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <BlogCardAdmin
              key={post._id}
              post={post}
              brand={brand}
              onDelete={handleDelete}
              deleting={deletingSlug === (post.slug || post._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
