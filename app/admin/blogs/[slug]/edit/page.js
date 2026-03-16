"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Save, Send, ImagePlus } from "lucide-react";
import { BlogEditor } from "@/app/admin/components/blog";

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled";
}

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]";
const LABEL_CLASS = "text-sm font-semibold text-gray-700 mb-1.5 block";

export default function AdminBlogEditPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const slug = params?.slug;
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain ||
    "";

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const imageInputRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [slugField, setSlugField] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredPreview, setFeaturedPreview] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveType, setSaveType] = useState(null);

  useEffect(() => {
    if (!slug || !brand) {
      setLoaded(true);
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
        if (cancelled) return;
        if (res.ok && data.post) {
          const p = data.post;
          setTitle(p.title || "");
          setSlugField(p.slug || "");
          setExcerpt(p.excerpt || "");
          setContent(p.content || "");
          setFeaturedImageUrl(p.featuredImage || "");
          setMetaTitle(p.metaTitle || "");
          setMetaDescription(p.metaDescription || "");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, brand]);

  const handleTitleChange = useCallback(
    (e) => {
      const v = e.target.value;
      setTitle(v);
      if (!slugTouched) setSlugField(slugify(v));
    },
    [slugTouched]
  );

  const handleSlugChange = useCallback((e) => {
    setSlugField(e.target.value);
    setSlugTouched(true);
  }, []);

  const handleFeaturedImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !brand) return;
    setFeaturedPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brand", brand);
      const res = await fetch("/api/admin/upload-email-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      setFeaturedImageUrl(data.url);
    } catch (err) {
      setFeaturedPreview("");
      alert(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFeaturedImage = () => {
    setFeaturedImageUrl("");
    setFeaturedPreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const submit = async (status) => {
    if (!brand || !slug) {
      alert("Missing brand or slug");
      return;
    }
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    setSaveType(status);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/blogs/${encodeURIComponent(slug)}?brand=${encodeURIComponent(brand)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: title.trim(),
            slug: slugField.trim() || slugify(title),
            content,
            excerpt: excerpt.trim(),
            featuredImage: featuredImageUrl,
            status,
            metaTitle: metaTitle.trim() || title.trim(),
            metaDescription: metaDescription.trim() || excerpt.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update post");
      }
      const newSlug = data.post?.slug || slug;
      router.push(`/admin/blogs/${newSlug}${qs}`);
    } catch (err) {
      alert(err.message || "Failed to update post");
    } finally {
      setSaving(false);
      setSaveType(null);
    }
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    submit("draft");
  };

  const handlePublish = (e) => {
    e.preventDefault();
    submit("published");
  };

  if (!loaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-[#2D545E]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F3F3F3] -mx-6 -my-8 px-6 py-8 md:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.push(`/admin/blogs/${slug}${qs}`)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            aria-label="Back to post"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Edit post
          </h1>
        </div>

        <form className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Title</label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Post title..."
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>URL slug</label>
              <input
                type="text"
                value={slugField}
                onChange={handleSlugChange}
                onBlur={() => setSlugTouched(true)}
                placeholder="url-slug"
                className={`${INPUT_CLASS} font-mono text-sm`}
              />
              {brand && (
                <p className="mt-1 text-xs text-gray-500">
                  Preview: .../blogs/{slugField || "untitled"}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Excerpt (short summary)</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary for listings and SEO..."
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Featured image</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex h-40 w-full sm:w-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:border-[#2D545E] hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {featuredPreview ? (
                  <img
                    src={featuredPreview}
                    alt="Featured"
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : featuredImageUrl ? (
                  <img
                    src={featuredImageUrl}
                    alt="Featured"
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm">
                      {uploading ? "Uploading..." : "Add image"}
                    </span>
                  </div>
                )}
              </button>
              {(featuredPreview || featuredImageUrl) && (
                <button
                  type="button"
                  onClick={removeFeaturedImage}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFeaturedImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Content</label>
            <BlogEditor
              value={content}
              onChange={setContent}
              brand={brand}
            />
          </div>

          <details className="rounded-xl border border-gray-300 bg-white overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
              SEO (meta title & description)
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
              <div>
                <label className={LABEL_CLASS}>Meta title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || "Defaults to post title"}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Meta description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={excerpt || "Defaults to excerpt"}
                  rows={2}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push(`/admin/blogs/${slug}${qs}`)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-600 px-6 py-2.5 text-white font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving && saveType === "draft" ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2D545E] px-6 py-2.5 text-white font-medium hover:bg-[#24454E] disabled:opacity-60 transition-colors"
            >
              <Send className="w-4 h-4" />
              {saving && saveType === "published" ? "Publishing..." : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
