"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import {
  ChevronDown,
  Clock3,
  FileText,
  ImagePlus,
  Monitor,
  Save,
  TextCursorInput,
  Undo2,
} from "lucide-react";
import { ServiceSuccessCard } from "@/app/admin/components/PublishSuccessCard";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]";

export default function EditServicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const serviceId = params?.id;
  const imageInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [openHoursSet, setOpenHoursSet] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    duration: "",
    durationUnit: "Minutes",
    bufferTime: "",
    mode: "Online (Google meet)",
    cancellationPolicy: "",
    price: "",
  });

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/booking-services/${serviceId}`, {
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok || !data?.service) return;
        const service = data.service;
        setImageUrl(service.image || "");
        setImagePreview(service.image || "");
        setForm({
          title: service.title || "",
          subtitle: service.subtitle || "",
          description: service.description || "",
          duration:
            service.duration !== undefined && service.duration !== null
              ? String(service.duration)
              : "",
          durationUnit: service.durationUnit || "Minutes",
          bufferTime:
            service.bufferTime !== undefined && service.bufferTime !== null
              ? String(service.bufferTime)
              : "",
          mode: service.mode || "Online (Google meet)",
          cancellationPolicy: service.cancellationPolicy || "",
          price:
            service.price !== undefined && service.price !== null
              ? String(service.price)
              : "",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  useEffect(() => {
    if (!brand) return;
    fetch(`/api/admin/booking-availability?brand=${encodeURIComponent(brand)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const schedule = data.weeklySchedule || [];
        const hasHours = schedule.some(
          (day) =>
            day.enabled &&
            Array.isArray(day.intervals) &&
            day.intervals.length > 0
        );
        setOpenHoursSet(!!hasHours);
      })
      .catch(() => setOpenHoursSet(false));
  }, [brand]);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !brand) return;
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brand", brand);
      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image");
      }
      setImageUrl(data.url);
    } catch (error) {
      alert(error.message || "Image upload failed");
      setImageUrl("");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!serviceId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/booking-services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          subtitle: form.subtitle.trim(),
          description: form.description.trim(),
          image: imageUrl,
          duration: form.duration,
          durationUnit: form.durationUnit,
          bufferTime: form.bufferTime,
          mode: form.mode,
          cancellationPolicy: form.cancellationPolicy.trim(),
          price: form.price,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.service) {
        throw new Error(data.error || "Failed to update booking service");
      }
      setShowSuccess(true);
    } catch (error) {
      alert(error.message || "Failed to update booking service");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading service...</p>;
  }

  if (showSuccess) {
    return (
      <div className="-mx-6 -my-8 px-6 py-8 md:px-10 bg-[#F3F3F3] min-h-[calc(100vh-4rem)]">
        <ServiceSuccessCard
          serviceId={serviceId}
          serviceTitle={form.title}
          brand={brand}
          onBackToList={() => router.push(`/admin/services${qs}`)}
        />
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-8 px-6 py-8 md:px-10 bg-[#F3F3F3] min-h-[calc(100vh-4rem)]">
      <h1 className="mb-8 text-3xl font-semibold tracking-wide text-[#111111]">
        Edit booking service
      </h1>

      {!openHoursSet && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
          Not live — Open hours not set
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="group flex h-[220px] w-full items-center justify-center rounded-sm border border-gray-300 bg-[#D8D8D8] text-center"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Booking preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <ImagePlus className="h-7 w-7" />
                    <span className="text-lg tracking-wide">Add image</span>
                  </div>
                )}
              </button>

              <div className="space-y-4">
                <div className="relative">
                  <TextCursorInput className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.title}
                    onChange={updateField("title")}
                    placeholder="Title..."
                    className={`${INPUT_CLASS} pl-11`}
                  />
                </div>
                <div className="relative">
                  <TextCursorInput className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={updateField("subtitle")}
                    placeholder="Subtitle..."
                    className={`${INPUT_CLASS} pl-11`}
                  />
                </div>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-4 h-5 w-5 text-gray-400" />
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={updateField("description")}
                    placeholder="Description..."
                    className={`${INPUT_CLASS} resize-none pl-11`}
                  />
                </div>
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock3 className="h-4 w-4" />
                  Duration
                </span>
                <div className="grid grid-cols-[1fr_160px] rounded-xl border border-gray-300 bg-white">
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={updateField("duration")}
                    placeholder="Duration"
                    className="rounded-l-xl border-r border-gray-300 bg-transparent px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <div className="relative">
                    <select
                      value={form.durationUnit}
                      onChange={updateField("durationUnit")}
                      className="h-full w-full appearance-none rounded-r-xl bg-transparent px-4 py-3 pr-10 text-base text-gray-900 focus:outline-none"
                    >
                      <option>Minutes</option>
                      <option>Hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </label>

              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock3 className="h-4 w-4" />
                  Buffer time
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.bufferTime}
                  onChange={updateField("bufferTime")}
                  placeholder="Add time gap between each booking"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Monitor className="h-4 w-4" />
                  Mode
                </span>
                <div className="relative">
                  <select
                    value={form.mode}
                    onChange={updateField("mode")}
                    className={`${INPUT_CLASS} appearance-none pr-10`}
                  >
                    <option>Online (Google meet)</option>
                    <option>Online (Zoom)</option>
                    <option>Offline (In person)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                </div>
              </label>

              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock3 className="h-4 w-4" />
                  Price (Rs.)
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={updateField("price")}
                  placeholder="Add price"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4" />
                Cancellation policy (optional)
              </span>
              <textarea
                rows={4}
                value={form.cancellationPolicy}
                onChange={updateField("cancellationPolicy")}
                placeholder="Add disclaimer for user regarding refund/cancellation."
                className={`${INPUT_CLASS} resize-none`}
              />
            </label>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2D545E] px-6 py-2.5 text-base font-medium text-white hover:bg-[#24454E] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9B0000] px-6 py-2.5 text-base font-medium text-white hover:bg-[#840000]"
              >
                <Undo2 className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
    </div>
  );
}
