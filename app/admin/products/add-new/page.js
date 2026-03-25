"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { Plus, X, Loader2 } from "lucide-react";

const MAX_IMAGES = 5;
const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-foreground";

function FormField({ id, label, required, children }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function calcPriceAfterDiscount(price, discount) {
  const p = Number(price) || 0;
  const d = Math.min(100, Math.max(0, Number(discount) || 0));
  return p * (1 - d / 100);
}

export default function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;

  const fileInputRef = useRef(null);
  const digitalFileInputRef = useRef(null);
  const [form, setForm] = useState({
    productName: "",
    tagline: "",
    description: "",
    specifications: "",
    termsAndConditions: "",
    images: [],
    price: "",
    discountPercentage: "",
    productType: "physical",
    digitalFiles: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [removingIndex, setRemovingIndex] = useState(null);

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const removeImage = async (i) => {
    const url = form.images[i];
    if (!url || !brand) return;

    setRemovingIndex(i);
    try {
      const res = await fetch("/api/admin/delete-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, brand }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setForm((prev) => ({
          ...prev,
          images: prev.images.filter((_, j) => j !== i),
        }));
      } else {
        alert(data.error || "Failed to delete image");
      }
    } catch {
      alert("Failed to delete image");
    } finally {
      setRemovingIndex(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !brand) return;
    if (form.images.length >= MAX_IMAGES) {
      alert(`Max ${MAX_IMAGES} images allowed`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brand", brand);
      const res = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, images: [...prev.images, data.url] }));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDigitalFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !brand) return;

    setUploadingDigital(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brand", brand);
      const res = await fetch("/api/admin/upload-digital-product-file", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.gcsPath) {
        setForm((prev) => ({
          ...prev,
          digitalFiles: [
            ...prev.digitalFiles,
            { filename: data.filename, mimeType: data.mimeType, gcsPath: data.gcsPath, size: data.size || 0 },
          ],
        }));
      } else {
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingDigital(false);
      e.target.value = "";
    }
  };

  const removeDigitalFile = (i) => {
    setForm((prev) => ({
      ...prev,
      digitalFiles: prev.digitalFiles.filter((_, j) => j !== i),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName.trim() || !brand) {
      alert("Product name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.productName.trim(),
          tagline: form.tagline.trim(),
          description: form.description.trim(),
          specifications: form.specifications.trim(),
          termsAndConditions: form.termsAndConditions.trim(),
          images: form.images,
          price: form.price,
          discountPercentage: form.discountPercentage,
          brand,
          type: form.productType,
          digitalFiles: form.productType === "digital" ? form.digitalFiles : [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.product) {
        const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
        router.push(`/admin/products${qs}`);
      } else {
        alert(data.error || "Failed to create product");
      }
    } catch {
      alert("Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const canAddMore = form.images.length < MAX_IMAGES;
  const priceAfterDiscount = calcPriceAfterDiscount(
    form.price,
    form.discountPercentage
  );

  return (
    <div className="px-8 py-8 max-w-2xl">
      <h1 className="mb-8 text-xl font-bold text-foreground">Add a product</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <FormField id="product-name" label="Product name" required>
          <input
            id="product-name"
            type="text"
            value={form.productName}
            onChange={update("productName")}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField id="tagline" label="Tagline">
          <input
            id="tagline"
            type="text"
            value={form.tagline}
            onChange={update("tagline")}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField id="description" label="Description">
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={update("description")}
            className={`${INPUT_CLASS} resize-none`}
          />
        </FormField>

        <FormField id="specifications" label="Specifications">
          <textarea
            id="specifications"
            rows={4}
            value={form.specifications}
            onChange={update("specifications")}
            className={`${INPUT_CLASS} resize-none`}
          />
        </FormField>

        <FormField id="termsAndConditions" label="Terms and conditions">
          <textarea
            id="termsAndConditions"
            rows={4}
            value={form.termsAndConditions}
            onChange={update("termsAndConditions")}
            className={`${INPUT_CLASS} resize-none`}
            placeholder="Add return, replacement, usage or legal terms for this product"
          />
        </FormField>

        <FormField id="product-type" label="Product type">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="productType"
                checked={form.productType === "physical"}
                onChange={() => setForm((p) => ({ ...p, productType: "physical" }))}
                className="rounded border-border bg-input text-ring"
              />
              <span>Physical</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="productType"
                checked={form.productType === "digital"}
                onChange={() => setForm((p) => ({ ...p, productType: "digital" }))}
                className="rounded border-border bg-input text-ring"
              />
              <span>Digital (customer gets download links by email after payment)</span>
            </label>
          </div>
        </FormField>

        {form.productType === "digital" && (
          <div>
            <label className={LABEL_CLASS}>Digital files (PDF, MP4, WAV, ZIP — max 100MB each)</label>
            <ul className="space-y-2 mb-2">
              {form.digitalFiles.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-muted-bg px-3 py-2 text-sm text-foreground">
                  <span className="truncate">{f.filename}</span>
                  <button
                    type="button"
                    onClick={() => removeDigitalFile(i)}
                    className="shrink-0 p-1 text-red-600 hover:bg-red-50 rounded"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => digitalFileInputRef.current?.click()}
              disabled={uploadingDigital}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
            >
              {uploadingDigital ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add file
            </button>
            <input
              ref={digitalFileInputRef}
              type="file"
              accept=".pdf,.mp4,.wav,.zip,application/pdf,video/mp4,audio/wav,audio/x-wav,application/zip"
              onChange={handleDigitalFileChange}
              className="hidden"
            />
          </div>
        )}

        <div>
          <label className={LABEL_CLASS}>
            Add images ({form.images.length}/{MAX_IMAGES})
          </label>
          <div className="flex flex-wrap gap-3">
            {form.images.map((url, i) => (
              <div
                key={url}
                className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {removingIndex === i ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted transition-colors hover:border-[#2D545E] hover:text-[#2D545E] disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <FormField id="price" label="Price (INR)" required>
          <input
            id="price"
            type="number"
            min={0}
            step={0.01}
            value={form.price}
            onChange={update("price")}
            className={INPUT_CLASS}
            placeholder="0"
          />
        </FormField>

        <FormField id="discount" label="Discount percentage (if any)">
          <input
            id="discount"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={form.discountPercentage}
            onChange={update("discountPercentage")}
            className={INPUT_CLASS}
            placeholder="0"
          />
        </FormField>

        <div>
          <label className={LABEL_CLASS}>Price after discount</label>
          <p className="font-medium text-foreground">
            Rs. {priceAfterDiscount.toFixed(2)}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg bg-[#2D545E] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Add product"}
        </button>
      </form>
    </div>
  );
}
