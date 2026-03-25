"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Save, Send, ImagePlus } from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { BlogEditor } from "@/app/admin/components/blog";
import { BlogSuccessCard } from "@/app/admin/components/PublishSuccessCard";

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
  "w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";
const LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-foreground";

export default function AddNewBlogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain ||
    "";

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const imageInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdTitle, setCreatedTitle] = useState("");

  const handleTitleChange = useCallback(
    (e) => {
      const v = e.target.value;
      setTitle(v);
      if (!slugTouched) setSlug(slugify(v));
    },
    [slugTouched]
  );

  const handleSlugChange = useCallback((e) => {
    setSlug(e.target.value);
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
    if (!brand) {
      alert("Brand not found. Use ?subdomain=yourbrand");
      return;
    }
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    setSaveType(status);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          brand,
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          content,
          excerpt: excerpt.trim(),
          featuredImage: featuredImageUrl,
          status,
          metaTitle: metaTitle.trim() || title.trim(),
          metaDescription: metaDescription.trim() || excerpt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save post");
      }
      const post = data.post || {};
      setCreatedSlug(post.slug || slug.trim() || slugify(title));
      setCreatedTitle(post.title || title.trim());
      setShowSuccess(true);
    } catch (err) {
      alert(err.message || "Failed to save post");
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

  if (showSuccess) {
    return (
      <div className="-mx-6 -my-8 min-h-[calc(100vh-4rem)] bg-background px-6 py-8 text-foreground md:px-10">
        <div className="max-w-4xl mx-auto">
          <BlogSuccessCard
            slug={createdSlug}
            title={createdTitle}
            brand={brand}
            isPublished={saveType === "published"}
            onBackToList={() => router.push(`/admin/blogs${qs}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-8 min-h-[calc(100vh-4rem)] bg-background px-6 py-8 text-foreground md:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.push(`/admin/blogs${qs}`)}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
            aria-label="Back to blogs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-highlight">
            Add new post
          </h1>
        </div>

        <form className="space-y-6">
          {/* Title & slug */}
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
                value={slug}
                onChange={handleSlugChange}
                onBlur={() => setSlugTouched(true)}
                placeholder="url-slug"
                className={`${INPUT_CLASS} font-mono text-sm`}
              />
              {brand && (
                <p className="mt-1 text-xs text-muted">
                  Preview: .../blogs/{slug || "untitled"}
                </p>
              )}
            </div>
          </div>

          {/* Excerpt */}
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

          {/* Featured image */}
          <div>
            <label className={LABEL_CLASS}>Featured image</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex h-40 w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-card text-muted transition-colors hover:bg-muted-bg disabled:opacity-60 sm:w-48"
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

          {/* Content – Rich text */}
          <div>
            <label className={LABEL_CLASS}>Content</label>
            <BlogEditor
              value={content}
              onChange={setContent}
              brand={brand}
            />
          </div>

          {/* SEO (optional) */}
          <details className="overflow-hidden rounded-xl border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 font-medium text-foreground hover:bg-muted-bg">
              SEO (meta title & description)
            </summary>
            <div className="space-y-3 border-t border-border px-4 pb-4 pt-2">
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

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.push(`/admin/blogs${qs}`)}
              className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium text-foreground transition-colors hover:bg-muted-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-muted-bg px-6 py-2.5 font-medium text-foreground transition-colors hover:bg-card disabled:opacity-60"
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
