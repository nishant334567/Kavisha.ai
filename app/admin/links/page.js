"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E] text-sm";

export default function AdminLinksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [brandName, setBrandName] = useState("");
  const [title, setTitle] = useState("My links");
  const [links, setLinks] = useState([{ label: "", url: "", image: "" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";

  useEffect(() => {
    if (!brand) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/links?brand=${encodeURIComponent(brand)}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!cancelled && res.ok && data?.linkTree) {
          const lt = data.linkTree;
          setBrandName(lt.brandName || "");
          setTitle(lt.title || "My links");
          setLinks(
            Array.isArray(lt.links) && lt.links.length > 0
              ? lt.links.map((l) => ({ label: l.label || "", url: l.url || "", image: l.image || "", displayUrl: undefined }))
              : [{ label: "", url: "", image: "", displayUrl: undefined }]
          );
        }
      } catch {
        if (!cancelled) setLinks([{ label: "", url: "", image: "" }]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brand]);

  const addLink = () => {
    setLinks((prev) => [...prev, { label: "", url: "", image: "", displayUrl: undefined }]);
  };

  const removeLink = (index) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLink = (index, field, value) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateLinkImageAndDisplay = (index, imageUrl, displayUrl) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], image: imageUrl, displayUrl: displayUrl };
      return next;
    });
  };

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRefs = useRef({});

  const handleImageUpload = async (index, file) => {
    if (!file || !brand) return;
    setUploadingIndex(index);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("brand", brand);
      const res = await fetch("/api/admin/upload-link-image", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      if (data?.url) updateLinkImageAndDisplay(index, data.url, data?.signedUrl || data.url);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setUploadingIndex(null);
      if (fileInputRefs.current[index]) fileInputRefs.current[index].value = "";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!brand) return;
    setSaving(true);
    try {
      const payload = {
        brand,
        brandName: brandName.trim(),
        title: title.trim() || "My links",
        links: links
          .map((l) => ({
            label: (l.label || "").trim(),
            url: (l.url || "").trim(),
            image: (l.image || "").trim(),
          }))
          .filter((l) => l.label && l.url),
      };
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
    } catch (err) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-500">
        Loading…
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-gray-500">
        Brand is required. Go back and select a brand.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[#2D545E]/10 text-[#2D545E]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Link tree</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Brand name (display)
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. John Doe"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My links"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Links</label>
            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-1.5 text-sm text-[#2D545E] hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add link
            </button>
          </div>
          <div className="space-y-3">
            {links.map((link, index) => (
              <div
                key={index}
                className="flex gap-2 items-start rounded-lg border border-gray-200 p-3 bg-gray-50/50"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(index, "label", e.target.value)}
                    placeholder="Label"
                    className={INPUT_CLASS}
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                    placeholder="https://..."
                    className={INPUT_CLASS}
                  />
                  <div className={`flex items-center gap-2 sm:col-span-2`}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600">
                      {(link.displayUrl || link.image) ? (
                        <img
                          src={link.displayUrl || link.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {(link.label || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <input
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageUpload(index, f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploadingIndex === index}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingIndex === index ? "Uploading…" : "Upload image"}
                      </button>
                      {(link.displayUrl || link.image) && (
                        <button
                          type="button"
                          onClick={() => updateLinkImageAndDisplay(index, "", undefined)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded"
                  aria-label="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#2D545E] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <a
            href={`/links${brand ? `?brand=${encodeURIComponent(brand)}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            View public page
          </a>
        </div>
      </form>
    </div>
  );
}
