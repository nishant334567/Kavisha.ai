"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { BlogPostContent, BlogCard } from "@/app/components/blog";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogPostPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const brandContext = useBrandContext();
  const slug = params?.slug;
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [post, setPost] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug || !brand) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/blogs/${encodeURIComponent(slug)}?brand=${encodeURIComponent(brand)}`
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

  useEffect(() => {
    if (!brand) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/blogs?brand=${encodeURIComponent(brand)}&limit=4`
        );
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.posts)) {
          const others = data.posts.filter((p) => (p.slug || p._id) !== slug);
          setRecentPosts(others.slice(0, 3));
        }
      } catch {
        if (!cancelled) setRecentPosts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [brand, slug]);

  const blogsHref = brand
    ? `/blogs?subdomain=${encodeURIComponent(brand)}`
    : "/blogs";

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-gray-600">Post not found.</p>
        <button
          type="button"
          onClick={() => router.push(blogsHref)}
          className="mt-4 inline-flex items-center gap-2 text-[#2D545E] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <button
        type="button"
        onClick={() => router.push(blogsHref)}
        className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </button>
      <BlogPostContent
        post={post}
        brandName={brandContext?.brandName}
        brandImageUrl={brandContext?.logoUrl || brandContext?.brandImageUrl}
      />
      {recentPosts.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl border-t border-gray-200 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="text-xl font-bold text-gray-900">Read more articles</h2>
            <Link
              href={blogsHref}
              className="text-sm font-medium text-[#2D545E] hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((p) => (
              <BlogCard key={p._id || p.slug} post={p} brand={brand} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
