"use client";
import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import BrandHeroImageFrame from "@/app/components/BrandHeroImageFrame";
import { Check, X, ArrowLeft, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOGIN_BUTTON_TEXT } from "@/app/lib/loginButtonText";

export default function EditProfile() {
  const brand = useBrandContext();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    brandName: "",
    loginButtonText: "",
  });
  const [editing, setEditing] = useState({
    title: false,
    subtitle: false,
    brandName: false,
    loginButtonText: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState({
    logo: false,
    brandImage: false,
  });
  const [heroZoom, setHeroZoom] = useState(1);
  const [heroFocusY, setHeroFocusY] = useState(50);
  const [heroFocusX, setHeroFocusX] = useState(50);
  const [heroSaving, setHeroSaving] = useState(false);
  const inputClass =
    "flex-1 rounded-lg border border-border bg-input px-3 py-2 text-foreground";
  const iconButtonClass = "text-green-600 hover:text-green-700";
  const cancelIconButtonClass = "text-red-600 hover:text-red-700";

  // Initialize formData with brand values
  useEffect(() => {
    if (brand) {
      setFormData({
        title: brand.title || "",
        subtitle: brand.subtitle || "",
        brandName: brand.brandName || "",
        loginButtonText: brand.loginButtonText || "",
      });
    }
  }, [brand]);

  useEffect(() => {
    if (!brand) return;
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
  }, [
    brand?.brandHeroZoom,
    brand?.brandHeroFocusY,
    brand?.brandHeroFocusX,
    brand?.brandImageUrl,
  ]);

  const handleSaveHeroFraming = async () => {
    if (!brand?.subdomain) return;
    setHeroSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/edit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brand.subdomain,
          brandName: brand.brandName,
          title: brand.title,
          subtitle: brand.subtitle,
          loginButtonText: brand.loginButtonText,
          brandHeroZoom: heroZoom,
          brandHeroFocusY: heroFocusY,
          brandHeroFocusX: heroFocusX,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save hero framing");
      }
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to save hero framing");
    } finally {
      setHeroSaving(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
  };

  const handleCancel = (field) => {
    setEditing((prev) => ({ ...prev, [field]: false }));
    // Reset to original value
    setFormData((prev) => ({
      ...prev,
      [field]: brand?.[field] || "",
    }));
  };

  const handleSave = async (field) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/edit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: brand?.subdomain,
          brandName:
            field === "brandName" ? formData.brandName : brand?.brandName,
          title: field === "title" ? formData.title : brand?.title,
          subtitle: field === "subtitle" ? formData.subtitle : brand?.subtitle,
          loginButtonText:
            field === "loginButtonText"
              ? formData.loginButtonText
              : brand?.loginButtonText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setEditing((prev) => ({ ...prev, [field]: false }));
      window.location.reload();
    } catch (err) {
      setError(err.message || "An error occurred");
      console.error("Error saving:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (imageType, file) => {
    if (!file) return;

    setUploading((prev) => ({ ...prev, [imageType]: true }));
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subdomain", brand?.subdomain);
      formData.append("imageType", imageType);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      window.location.reload();
    } catch (err) {
      setError(err.message || "An error occurred while uploading");
      console.error("Error uploading image:", err);
    } finally {
      setUploading((prev) => ({ ...prev, [imageType]: false }));
    }
  };

  return (
    <>
      {error && (
        <div className="bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}
      <div className="mx-auto w-full bg-background py-6 text-foreground md:max-w-6xl md:px-4">
        {/* Back Button and Profile Picture and Name */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-foreground transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="group relative">
            <img
              src={brand?.logoUrl}
              alt={brand?.brandName || "Profile"}
              className="w-12 h-12 rounded-full object-cover"
            />
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload("logo", file);
                }}
                className="hidden"
                disabled={uploading.logo}
              />
              <span className="text-white text-xs">
                {uploading.logo ? "Uploading..." : "Upload"}
              </span>
            </label>
          </div>
          {editing.brandName ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => handleChange("brandName", e.target.value)}
                className={`${inputClass} font-baloo text-lg font-semibold`}
                disabled={loading}
              />
              <button
                onClick={() => handleSave("brandName")}
                disabled={loading}
                className={iconButtonClass}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCancel("brandName")}
                disabled={loading}
                className={cancelIconButtonClass}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-baloo text-lg font-semibold text-highlight">
                {formData.brandName || brand?.brandName}
              </h2>
              <button
                onClick={() => handleEdit("brandName")}
                className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </>
          )}
        </div>

        {/* Cover Photo — same 3:1 crop as public avatar homepage */}
        <div className="relative mb-8 w-full">
          {brand?.brandImageUrl ? (
            <div className="group relative w-full overflow-hidden rounded-xl">
              <BrandHeroImageFrame
                imageUrl={brand.brandImageUrl}
                alt={brand?.brandName || "Cover"}
                zoom={heroZoom}
                focusX={heroFocusX}
                focusY={heroFocusY}
                className="rounded-xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              />
              {/* Hover: sliders (bottom-center) + upload/save (bottom-right) */}
              <div className="pointer-events-none absolute inset-0 z-[2] rounded-xl opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="pointer-events-auto absolute bottom-2 left-1/2 z-10 w-[200px] max-w-[calc(100%-5.5rem)] -translate-x-1/2 space-y-2 rounded-lg border border-white/15 bg-black/55 px-2.5 py-2 shadow-lg backdrop-blur-md">
                  <label className="block text-[10px] font-medium leading-tight text-white/95">
                    <span className="flex justify-between gap-1">
                      <span>Zoom</span>
                      <span className="tabular-nums text-white/80">
                        {heroZoom.toFixed(2)}×
                      </span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.02}
                      value={heroZoom}
                      onChange={(e) => setHeroZoom(Number(e.target.value))}
                      disabled={!brand?.brandImageUrl}
                      className="mt-0.5 h-1 w-full cursor-pointer accent-[#2d545e]"
                      aria-label="Hero zoom"
                    />
                  </label>
                  <label className="block text-[10px] font-medium leading-tight text-white/95">
                    <span className="flex justify-between gap-1">
                      <span>Vertical</span>
                      <span className="tabular-nums text-white/80">{heroFocusY}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={heroFocusY}
                      onChange={(e) => setHeroFocusY(Number(e.target.value))}
                      disabled={!brand?.brandImageUrl}
                      className="mt-0.5 h-1 w-full cursor-pointer accent-[#2d545e]"
                      aria-label="Vertical focus, 0 top 100 bottom"
                    />
                  </label>
                  <label className="block text-[10px] font-medium leading-tight text-white/95">
                    <span className="flex justify-between gap-1">
                      <span>Horizontal</span>
                      <span className="tabular-nums text-white/80">{heroFocusX}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={heroFocusX}
                      onChange={(e) => setHeroFocusX(Number(e.target.value))}
                      disabled={!brand?.brandImageUrl}
                      className="mt-0.5 h-1 w-full cursor-pointer accent-[#2d545e]"
                      aria-label="Horizontal focus, 0 left 100 right"
                    />
                  </label>
                </div>
                <div className="pointer-events-auto absolute bottom-2 right-2 z-10 flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <label className="cursor-pointer rounded-lg border border-white/20 bg-black/55 px-3 py-1.5 text-center text-xs font-medium text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload("brandImage", file);
                        e.target.value = "";
                      }}
                      className="sr-only"
                      disabled={uploading.brandImage || heroSaving}
                    />
                    {uploading.brandImage ? "Uploading…" : "Upload different image"}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSaveHeroFraming()}
                    disabled={heroSaving || uploading.brandImage}
                    className="rounded-lg bg-[#2D545E] px-3 py-1.5 text-xs font-medium text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {heroSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative w-full overflow-hidden rounded-xl">
              <div className="flex aspect-[3/1] w-full items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center text-muted">
                <span className="text-sm">Hover the frame to upload a cover photo</span>
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
              />
              <div className="pointer-events-none absolute inset-0 z-[2] rounded-xl opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="pointer-events-auto absolute bottom-2 right-2 z-10">
                  <label className="inline-flex cursor-pointer rounded-lg border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-medium text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload("brandImage", file);
                        e.target.value = "";
                      }}
                      className="sr-only"
                      disabled={uploading.brandImage}
                    />
                    {uploading.brandImage ? "Uploading…" : "Upload photo"}
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title/Headline */}
        <div className="mb-10">
          {editing.title ? (
            <div className="relative flex items-center justify-center gap-3">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-center font-baloo text-3xl text-foreground sm:text-4xl"
                disabled={loading}
              />
              <div className="absolute right-0 flex flex-col gap-2">
                <button
                  onClick={() => handleSave("title")}
                  disabled={loading}
                  className={iconButtonClass}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleCancel("title")}
                  disabled={loading}
                  className={cancelIconButtonClass}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <p className="text-justify font-baloo text-3xl text-foreground sm:text-4xl">
                {formData.title || brand?.title}
              </p>
              <button
                onClick={() => handleEdit("title")}
                className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Biography/Subtitle */}
        <div className="mb-8">
          {editing.subtitle ? (
            <div className="flex items-start gap-3 justify-center">
              <textarea
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-justify font-baloo text-base leading-relaxed text-foreground"
                rows="4"
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSave("subtitle")}
                  disabled={loading}
                  className={iconButtonClass}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleCancel("subtitle")}
                  disabled={loading}
                  className={cancelIconButtonClass}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="px-20 text-justify font-baloo text-base leading-relaxed text-muted">
                {formData.subtitle || brand?.subtitle}
              </p>
              <button
                onClick={() => handleEdit("subtitle")}
                className="absolute right-0 top-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Login Button */}
        <div className="font-baloo mb-12 flex flex-col items-center gap-3">
          {editing.loginButtonText ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.loginButtonText}
                onChange={(e) =>
                  handleChange("loginButtonText", e.target.value)
                }
                className="rounded-lg border border-border bg-input px-4 py-2 text-foreground"
                disabled={loading}
              />
              <button
                onClick={() => handleSave("loginButtonText")}
                disabled={loading}
                className={iconButtonClass}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCancel("loginButtonText")}
                disabled={loading}
                className={cancelIconButtonClass}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit("loginButtonText")}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-muted-bg px-6 py-2 font-medium text-highlight shadow-md transition-colors hover:bg-card"
            >
              {formData.loginButtonText ||
                brand?.loginButtonText ||
                DEFAULT_LOGIN_BUTTON_TEXT}
              <Pencil className="w-4 h-4 text-highlight" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted">
          Powered by KAVISHA
        </div>
      </div>
    </>
  );
}
