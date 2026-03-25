"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";

const EMPTY_SOCIAL = {
  youtube: { enabled: false, url: "" },
  linkedin: { enabled: false, url: "" },
  twitter: { enabled: false, url: "" },
  instagram: { enabled: false, url: "" },
  facebook: { enabled: false, url: "" },
};

const SOCIAL_FIELDS = [
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter / X" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
];

function mergeSocial(raw) {
  const next = { ...EMPTY_SOCIAL };
  if (!raw || typeof raw !== "object") return next;
  for (const { key } of SOCIAL_FIELDS) {
    const s = raw[key];
    if (s && typeof s === "object") {
      next[key] = {
        enabled: !!s.enabled,
        url: (s.url || "").toString(),
      };
    }
  }
  return next;
}

export default function AdminLinksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const [links, setLinks] = useState([{ label: "", url: "", image: "" }]);
  const [social, setSocial] = useState(EMPTY_SOCIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          setLinks(
            Array.isArray(lt.links) && lt.links.length > 0
              ? lt.links.map((l) => ({ label: l.label || "", url: l.url || "", image: l.image || "", displayUrl: undefined }))
              : [{ label: "", url: "", image: "", displayUrl: undefined }]
          );
          setSocial(mergeSocial(lt.social));
        }
      } catch {
        if (!cancelled) {
          setLinks([{ label: "", url: "", image: "" }]);
          setSocial(EMPTY_SOCIAL);
        }
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
        links: links
          .map((l) => ({
            label: (l.label || "").trim(),
            url: (l.url || "").trim(),
            image: (l.image || "").trim(),
          }))
          .filter((l) => l.label && l.url),
        social,
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
      <div className="mx-auto max-w-2xl px-4 py-8 text-muted">
        Loading…
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-muted">
        Brand is required. Go back and select a brand.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-background px-4 py-6 text-foreground">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-highlight hover:bg-muted-bg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-highlight">Link tree</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-foreground">Links</label>
            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-1.5 text-sm text-highlight hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add link
            </button>
          </div>
          <div className="space-y-3">
            {links.map((link, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
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
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted-bg text-muted">
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
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground hover:bg-muted-bg disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingIndex === index ? "Uploading…" : "Upload image"}
                      </button>
                      {(link.displayUrl || link.image) && (
                        <button
                          type="button"
                          onClick={() => updateLinkImageAndDisplay(index, "", undefined)}
                          className="rounded p-1.5 text-muted hover:bg-muted-bg hover:text-red-600"
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
                  className="rounded p-2 text-muted hover:bg-muted-bg hover:text-red-600"
                  aria-label="Remove link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Social links
          </label>
          <p className="mb-3 text-xs text-muted">
            Shown as icons at the bottom of the public link page when enabled.
          </p>
          <div className="space-y-3">
            {SOCIAL_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="space-y-2 rounded-lg border border-border bg-card p-3"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={social[key].enabled}
                    onChange={(e) =>
                      setSocial((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], enabled: e.target.checked },
                      }))
                    }
                    className="rounded border-border text-highlight focus:ring-highlight"
                  />
                  {label}
                </label>
                <input
                  type="url"
                  value={social[key].url}
                  onChange={(e) =>
                    setSocial((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], url: e.target.value },
                    }))
                  }
                  placeholder="https://…"
                  disabled={!social[key].enabled}
                  className={`${INPUT_CLASS} ${!social[key].enabled ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <a
            href={`/links${brand ? `?subdomain=${encodeURIComponent(brand)}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
          >
            View public page
          </a>
        </div>
      </form>
    </div>
  );
}
