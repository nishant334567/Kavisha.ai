"use client";
import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Check, X } from "lucide-react";

export default function EditProfile() {
  const brand = useBrandContext();
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
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="w-[80%] mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <img src={brand?.logoUrl} className="w-12 h-12 rounded" />
            <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 rounded flex items-center justify-center transition-opacity">
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
                className="px-2 py-1 border border-gray-300 rounded flex-1"
                disabled={loading}
              />
              <button
                onClick={() => handleSave("brandName")}
                disabled={loading}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCancel("brandName")}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <p>{formData.brandName || brand?.brandName}</p>
              <button
                onClick={() => handleEdit("brandName")}
                className="px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>

        <div className="mt-4 h-48 sm:h-80 w-full rounded-xl relative group">
          <img
            src={brand?.brandImageUrl}
            alt={brand?.brandName || "Brand"}
            className="w-full h-full object-cover rounded-xl"
          />
          <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 rounded-xl flex items-center justify-center transition-opacity">
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
            <span className="px-4 py-2 bg-gray-100 text-black rounded">
              {uploading.brandImage ? "Uploading..." : "Upload Image"}
            </span>
          </label>
        </div>

        <div className="text-center mx-auto max-w-4xl">
          {editing.title ? (
            <div className="flex items-center justify-center gap-2 my-2">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="text-2xl sm:text-4xl lg:text-6xl font-bold px-2 py-1 border border-gray-300 rounded w-full"
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
            <div className="relative">
              <p className="text-2xl sm:text-4xl lg:text-6xl font-bold my-2">
                {formData.title || brand?.title}
              </p>
              <button
                onClick={() => handleEdit("title")}
                className="absolute right-0 top-0 px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
            </div>
          )}

          {editing.subtitle ? (
            <div className="flex items-start justify-center gap-2 px-4">
              <textarea
                value={formData.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                className="text-gray-500 text-sm sm:text-base leading-relaxed px-2 py-1 border border-gray-300 rounded w-full resize-none"
                rows="3"
                disabled={loading}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleSave("subtitle")}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCancel("subtitle")}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative px-4">
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                {formData.subtitle || brand?.subtitle}
              </p>
              <button
                onClick={() => handleEdit("subtitle")}
                className="mt-2 px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
            </div>
          )}

          {/* Login Button */}
          <div className="mt-6 flex justify-center">
            {editing.loginButtonText ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.loginButtonText}
                  onChange={(e) =>
                    handleChange("loginButtonText", e.target.value)
                  }
                  className="px-4 py-2 border border-gray-300 rounded"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSave("loginButtonText")}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCancel("loginButtonText")}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button className="px-6 py-3 bg-purple-200 text-black rounded-lg font-medium hover:bg-purple-300 transition-colors">
                  {formData.loginButtonText ||
                    brand?.loginButtonText ||
                    "Talk to me now"}
                </button>
                <button
                  onClick={() => handleEdit("loginButtonText")}
                  className="px-3 py-1 bg-gray-100 text-black text-sm rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
