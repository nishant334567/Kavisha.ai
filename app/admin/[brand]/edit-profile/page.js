"use client";

import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import BrandHeroImageFrame from "@/app/components/BrandHeroImageFrame";
import { ArrowLeft, Eye, Pencil, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOGIN_BUTTON_TEXT } from "@/app/lib/loginButtonText";

function SplitHomepageCard({
  brandImageUrl,
  brandName,
  title,
  subtitle,
  loginButtonText,
  heroZoom,
  heroFocusX,
  heroFocusY,
  preview = false,
}) {
  const loginLabel = (
    loginButtonText || DEFAULT_LOGIN_BUTTON_TEXT
  ).toUpperCase();

  return (
    <div className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:min-h-[560px] lg:grid-cols-2">
      <div className="relative aspect-square w-full bg-muted-bg lg:aspect-auto lg:min-h-0">
        {brandImageUrl ? (
          <BrandHeroImageFrame
            fill
            imageUrl={brandImageUrl}
            alt={brandName || "Cover"}
            zoom={heroZoom}
            focusX={heroFocusX}
            focusY={heroFocusY}
            className="absolute inset-0 rounded-t-2xl lg:min-h-full lg:rounded-l-2xl lg:rounded-tr-none"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-sm text-muted lg:aspect-auto lg:min-h-full">
            Upload a cover photo
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center gap-5 px-6 py-8 lg:px-10 lg:py-12">
        <div className="space-y-3">
          <h1 className="font-baloo text-2xl font-normal leading-snug text-foreground md:text-3xl">
            {title || "Your headline"}
          </h1>
          <p className="font-baloo text-sm leading-relaxed text-muted md:text-base">
            {subtitle || "Your welcome message appears here."}
          </p>
        </div>
        <span className="font-baloo inline-flex w-fit rounded-full bg-muted-bg px-6 py-2.5 text-sm font-medium text-highlight">
          {loginLabel}
        </span>
        {preview && (
          <p className="text-xs text-muted">Preview — how visitors see your homepage</p>
        )}
      </div>
    </div>
  );
}

export default function EditProfile() {
  const brand = useBrandContext();
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    brandName: "",
    loginButtonText: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState({ logo: false, brandImage: false });
  const [heroZoom, setHeroZoom] = useState(1);
  const [heroFocusY, setHeroFocusY] = useState(50);
  const [heroFocusX, setHeroFocusX] = useState(50);
  const [heroAdjustOpen, setHeroAdjustOpen] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setFormData({
      title: brand.title || "",
      subtitle: brand.subtitle || "",
      brandName: brand.brandName || "",
      loginButtonText: brand.loginButtonText || "",
    });
    setHeroZoom(
      typeof brand.brandHeroZoom === "number" && Number.isFinite(brand.brandHeroZoom)
        ? brand.brandHeroZoom
        : 1
    );
    setHeroFocusY(
      typeof brand.brandHeroFocusY === "number" &&
        Number.isFinite(brand.brandHeroFocusY)
        ? brand.brandHeroFocusY
        : 50
    );
    setHeroFocusX(
      typeof brand.brandHeroFocusX === "number" &&
        Number.isFinite(brand.brandHeroFocusX)
        ? brand.brandHeroFocusX
        : 50
    );
  }, [brand]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!brand?.subdomain) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/edit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brand.subdomain,
          brandName: formData.brandName,
          title: formData.title,
          subtitle: formData.subtitle,
          loginButtonText: formData.loginButtonText,
          brandHeroZoom: heroZoom,
          brandHeroFocusY: heroFocusY,
          brandHeroFocusX: heroFocusX,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (imageType, file) => {
    if (!file || !brand?.subdomain) return;
    setUploading((prev) => ({ ...prev, [imageType]: true }));
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subdomain", brand.subdomain);
      fd.append("imageType", imageType);
      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [imageType]: false }));
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-highlight focus:ring-2 focus:ring-highlight/10";

  if (!brand) return null;

  return (
    <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-6xl px-4 py-8 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <label className="group relative cursor-pointer">
          <img
            src={brand.logoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-2 ring-border/60"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {uploading.logo ? "…" : "Logo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading.logo}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload("logo", file);
              e.target.value = "";
            }}
          />
        </label>

        <input
          type="text"
          value={formData.brandName}
          onChange={(e) => handleChange("brandName", e.target.value)}
          disabled={preview}
          placeholder="Brand name"
          className={`${inputClass} max-w-[200px] font-medium`}
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              preview
                ? "border-highlight bg-highlight/10 text-highlight"
                : "border-border text-foreground hover:bg-muted-bg"
            }`}
          >
            {preview ? (
              <>
                <Pencil className="h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview
              </>
            )}
          </button>
          {!preview && (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="rounded-full bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {preview ? (
        <SplitHomepageCard
          preview
          brandImageUrl={brand.brandImageUrl}
          brandName={formData.brandName}
          title={formData.title}
          subtitle={formData.subtitle}
          loginButtonText={formData.loginButtonText}
          heroZoom={heroZoom}
          heroFocusX={heroFocusX}
          heroFocusY={heroFocusY}
        />
      ) : (
        <div className="grid min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:min-h-[560px] lg:grid-cols-2">
          {/* Left — banner */}
          <div className="group relative aspect-square w-full bg-muted-bg lg:aspect-auto lg:min-h-0">
            {brand.brandImageUrl ? (
              <BrandHeroImageFrame
                fill
                imageUrl={brand.brandImageUrl}
                alt={formData.brandName || "Cover"}
                zoom={heroZoom}
                focusX={heroFocusX}
                focusY={heroFocusY}
                className="absolute inset-0 rounded-t-2xl lg:min-h-full lg:rounded-l-2xl lg:rounded-tr-none"
              />
            ) : (
              <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 text-sm text-muted lg:aspect-auto lg:min-h-full">
                <Upload className="h-6 w-6" />
                Upload cover photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading.brandImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload("brandImage", file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}

            {brand.brandImageUrl && (
              <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-end justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setHeroAdjustOpen((o) => !o)}
                  className="rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/60"
                >
                  {heroAdjustOpen ? "Done" : "Adjust crop"}
                </button>
                <label className="cursor-pointer rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/60">
                  {uploading.brandImage ? "Uploading…" : "Change photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading.brandImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload("brandImage", file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}

            {heroAdjustOpen && brand.brandImageUrl && (
              <div className="absolute left-3 right-3 top-3 z-10 space-y-2 rounded-xl border border-white/15 bg-black/55 p-3 backdrop-blur-md">
                <label className="block text-[10px] font-medium text-white">
                  <span className="flex justify-between">
                    Zoom <span>{heroZoom.toFixed(2)}×</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.02}
                    value={heroZoom}
                    onChange={(e) => setHeroZoom(Number(e.target.value))}
                    className="mt-1 h-1 w-full accent-white"
                  />
                </label>
                <label className="block text-[10px] font-medium text-white">
                  <span className="flex justify-between">
                    Vertical <span>{heroFocusY}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={heroFocusY}
                    onChange={(e) => setHeroFocusY(Number(e.target.value))}
                    className="mt-1 h-1 w-full accent-white"
                  />
                </label>
                <label className="block text-[10px] font-medium text-white">
                  <span className="flex justify-between">
                    Horizontal <span>{heroFocusX}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={heroFocusX}
                    onChange={(e) => setHeroFocusX(Number(e.target.value))}
                    className="mt-1 h-1 w-full accent-white"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Right — fields */}
          <div className="flex flex-col justify-center gap-5 px-6 py-8 lg:px-10 lg:py-12">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Headline
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Welcome message"
                className={`${inputClass} font-baloo text-lg md:text-xl`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Subtitle
              </label>
              <textarea
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                placeholder="Tell visitors about you"
                rows={4}
                className={`${inputClass} resize-none font-baloo leading-relaxed`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Login button
              </label>
              <input
                type="text"
                value={formData.loginButtonText}
                onChange={(e) =>
                  handleChange("loginButtonText", e.target.value)
                }
                placeholder={DEFAULT_LOGIN_BUTTON_TEXT}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">Powered by KAVISHA</p>
    </div>
  );
}
