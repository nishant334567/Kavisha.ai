"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  ImagePlus,
  Monitor,
  Save,
  TextCursorInput,
  Undo2,
} from "lucide-react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { ServiceSuccessCard } from "@/app/admin/components/PublishSuccessCard";

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[18px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]";
const LABEL_CLASS = "text-[22px] font-medium text-gray-800 tracking-wide";

function Field({ label, icon: Icon, children }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr] md:items-start">
      <p className={`${LABEL_CLASS} inline-flex items-center gap-2`}>
        {Icon ? <Icon className="h-5 w-5 text-gray-500" /> : null}
        <span>{label}</span>
      </p>
      <div>{children}</div>
    </div>
  );
}

export default function AddBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandContext = useBrandContext();
  const brand =
    searchParams?.get("subdomain")?.trim() ||
    searchParams?.get("brand")?.trim() ||
    brandContext?.subdomain;
  const qs = brand ? `?subdomain=${encodeURIComponent(brand)}` : "";
  const imageInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdService, setCreatedService] = useState(null);
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

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !brand) return;
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    const upload = async () => {
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
        setImageUrl("");
        alert(error.message || "Image upload failed");
      } finally {
        setUploading(false);
      }
    };
    upload();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!brand) {
      alert("Brand not found");
      return;
    }
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!form.duration) {
      alert("Duration is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/booking-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          brand,
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
        throw new Error(data.error || "Failed to save booking");
      }
      setCreatedService(data.service);
      setShowSuccess(true);
    } catch (error) {
      alert(error.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  if (showSuccess && createdService) {
    return (
      <div className="-mx-6 -my-8 px-6 py-8 md:px-10 bg-[#F3F3F3] min-h-[calc(100vh-4rem)]">
        <ServiceSuccessCard
          serviceId={createdService._id}
          serviceTitle={createdService.title}
          brand={brand}
          onBackToList={() => router.push(`/admin/services${qs}`)}
        />
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-8 px-6 py-8 md:px-10 bg-[#F3F3F3] min-h-[calc(100vh-4rem)]">
      <h1 className="mb-10 text-5xl font-semibold tracking-wide text-[#111111]">
        Create a booking
      </h1>

      <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="group flex h-[240px] w-full items-center justify-center rounded-sm border border-gray-300 bg-[#D8D8D8] text-center"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Booking preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-[30px] tracking-wide">Add image</span>
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

            <section className="space-y-6">
              <h2 className="text-[30px] font-medium tracking-wide text-gray-800">
                Session details
              </h2>

              <Field label="Duration" icon={Clock3}>
                <div className="grid max-w-xl grid-cols-[1fr_170px] rounded-xl border border-gray-300 bg-white">
                  <input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={updateField("duration")}
                    placeholder="Duration..."
                    className="rounded-l-xl border-r border-gray-300 bg-transparent px-4 py-3 text-[18px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <div className="relative">
                    <select
                      value={form.durationUnit}
                      onChange={updateField("durationUnit")}
                      className="h-full w-full appearance-none rounded-r-xl bg-transparent px-4 py-3 pr-10 text-[18px] text-gray-900 focus:outline-none"
                    >
                      <option>Minutes</option>
                      <option>Hours</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </Field>

              <Field label="Buffer time" icon={Clock3}>
                <input
                  type="number"
                  min={0}
                  value={form.bufferTime}
                  onChange={updateField("bufferTime")}
                  placeholder="Add time gap between each booking"
                  className="max-w-xl rounded-xl border border-gray-300 bg-white px-4 py-3 text-[18px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]"
                />
              </Field>

              <Field label="Calendar" icon={CalendarDays}>
                <button
                  type="button"
                  className="inline-flex items-center gap-3 text-[28px] font-medium text-[#1D2A33] hover:opacity-85"
                >
                  Select date(s) in calendar
                  <ArrowRight className="h-8 w-8" />
                </button>
              </Field>

              <Field label="Mode" icon={Monitor}>
                <div className="relative max-w-xl">
                  <select
                    value={form.mode}
                    onChange={updateField("mode")}
                    className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-[18px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]"
                  >
                    <option>Online (Google meet)</option>
                    <option>Online (Zoom)</option>
                    <option>Offline (In person)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                </div>
              </Field>

              <Field label="Cancellation policy (optional)" icon={FileText}>
                <textarea
                  rows={4}
                  value={form.cancellationPolicy}
                  onChange={updateField("cancellationPolicy")}
                  placeholder="Add disclaimer for user regarding refund/cancellation."
                  className="max-w-3xl w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[18px] text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]"
                />
              </Field>

              <Field label="Price" icon={CircleDollarSign}>
                <div className="relative max-w-xs">
                  <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={updateField("price")}
                    placeholder="Add price (in Rs.)"
                    className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-[18px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D545E]/25 focus:border-[#2D545E]"
                  />
                </div>
              </Field>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2D545E] px-10 py-2 text-[30px] font-medium text-white hover:bg-[#24454E] disabled:opacity-60"
              >
                <Save className="h-7 w-7" />
                {saving ? "Saving..." : "Save booking"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9B0000] px-10 py-2 text-[30px] font-medium text-white hover:bg-[#840000]"
              >
                <Undo2 className="h-7 w-7" />
                Cancel
              </button>
            </div>
          </form>
    </div>
  );
}
