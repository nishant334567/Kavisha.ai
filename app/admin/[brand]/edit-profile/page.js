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
        <div className="text-red-600 text-sm p-4 bg-red-50">{error}</div>
      )}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button and Profile Picture and Name */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="relative">
            <img
              src={brand?.logoUrl}
              alt={brand?.brandName || "Profile"}
              className="w-12 h-12 rounded-full object-cover"
            />
            <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
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
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => handleChange("brandName", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg flex-1 text-lg font-semibold"
                disabled={loading}
              />
              <button
                onClick={() => handleSave("brandName")}
                disabled={loading}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCancel("brandName")}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-black">
                {formData.brandName || brand?.brandName}
              </h2>
              <button
                onClick={() => handleEdit("brandName")}
                className="px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>

        {/* Cover Photo */}
        <div className="mb-8 h-64 sm:h-96 w-full relative overflow-hidden">
          <img
            src={brand?.brandImageUrl}
            alt={brand?.brandName || "Cover"}
            className="w-full h-full object-cover"
          />
          <label className="absolute bottom-4 right-4 cursor-pointer">
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
            <span className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors">
              {uploading.brandImage ? "Uploading..." : "Edit cover photo"}
            </span>
          </label>
        </div>

        {/* Title/Headline */}
        <div className="mb-6">
          {editing.title ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold px-3 py-2 border border-gray-300 rounded-lg w-full"
                disabled={loading}
              />
              <button
                onClick={() => handleSave("title")}
                disabled={loading}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCancel("title")}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black">
                {formData.title || brand?.title}
              </p>
              <button
                onClick={() => handleEdit("title")}
                className="px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Biography/Subtitle */}
        <div className="mb-8">
          {editing.subtitle ? (
            <div className="flex items-start gap-3">
              <textarea
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                className="text-black text-base leading-relaxed px-3 py-2 border border-gray-300 rounded-lg w-full resize-none"
                rows="4"
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSave("subtitle")}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleCancel("subtitle")}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <p className="text-black text-base leading-relaxed flex-1">
                {formData.subtitle || brand?.subtitle}
              </p>
              <button
                onClick={() => handleEdit("subtitle")}
                className="px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Login Button */}
        <div className="mb-12 flex flex-col items-center gap-3">
          {editing.loginButtonText ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.loginButtonText}
                onChange={(e) =>
                  handleChange("loginButtonText", e.target.value)
                }
                className="px-4 py-2 border border-gray-300 rounded-lg"
                disabled={loading}
              />
              <button
                onClick={() => handleSave("loginButtonText")}
                disabled={loading}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleCancel("loginButtonText")}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit("loginButtonText")}
              className="px-6 py-2 bg-purple-100 text-indigo-800 rounded-full font-medium hover:bg-purple-200 transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              {formData.loginButtonText ||
                brand?.loginButtonText ||
                "Talk to me now"}
              <Pencil className="w-4 h-4 text-indigo-800" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          Powered by KAVISHA
        </div>
      </div>
    </>
  );
}
