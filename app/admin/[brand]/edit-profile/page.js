"use client";
import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Check, X, ArrowLeft, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

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
                className={`${inputClass} font-akshar text-lg font-semibold`}
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
              <h2 className="font-akshar text-lg font-semibold text-highlight">
                {formData.brandName || brand?.brandName}
              </h2>
              <button
                onClick={() => handleEdit("brandName")}
                className="rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {/* Cover Photo */}
        <div className="relative mb-8 min-h-[200px] w-full overflow-hidden rounded-2xl border border-border bg-muted-bg md:min-h-[300px]">
          {brand?.brandImageUrl ? (
            <img
              src={brand.brandImageUrl}
              alt={brand?.brandName || "Cover"}
              className="w-full h-auto max-h-96 object-cover block m-0 p-0"
            />
          ) : (
            <div className="flex h-[200px] w-full items-center justify-center text-muted md:h-[300px]">
              <span className="text-sm">No cover photo</span>
            </div>
          )}
          <label className="absolute bottom-4 right-4 cursor-pointer md:bottom-8 md:right-12">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload("brandImage", file);
              }}
              className="hidden"
              disabled={uploading.brandImage}
            />
            <span className="rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card">
              {uploading.brandImage
                ? "Uploading..."
                : brand?.brandImageUrl
                ? "Edit cover photo"
                : "Add cover photo"}
            </span>
          </label>
        </div>

        {/* Title/Headline */}
        <div className="mb-6">
          {editing.title ? (
            <div className="relative flex items-center justify-center gap-3">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-center font-fredoka text-3xl text-foreground sm:text-4xl"
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
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex justify-end">
                <button
                  onClick={() => handleEdit("title")}
                  className="whitespace-nowrap rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
                >
                  Edit
                </button>
              </div>
              <p className="text-center font-fredoka text-3xl text-foreground sm:text-4xl">
                {formData.title || brand?.title}
              </p>
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
                className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-justify font-fredoka text-base leading-relaxed text-foreground"
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
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-justify font-fredoka text-base leading-relaxed text-muted">
                {formData.subtitle || brand?.subtitle}
              </p>
              <button
                onClick={() => handleEdit("subtitle")}
                className="whitespace-nowrap rounded-full bg-card px-3 py-1 text-sm text-foreground shadow-md transition-colors hover:bg-muted-bg"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Login Button */}
        <div className="font-akshar mb-12 flex flex-col items-center gap-3">
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
                "Talk to me now"}
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
