import { refreshImageUrl } from "@/app/lib/gcs";

/** Canonical URL stored on Brand (GCS path). */
export function getBrandImageUrl(url) {
  const s = typeof url === "string" ? url.trim() : "";
  return /^https?:\/\//i.test(s) ? s : null;
}

/** Browser-ready URL (signed when bucket is not public — same as quiz / JD). */
export async function resolveBrandImageUrl(url) {
  const s = getBrandImageUrl(url);
  if (!s) return null;
  if (!s.includes("storage.googleapis.com/")) return s;
  try {
    return (await refreshImageUrl(s)) || s;
  } catch {
    return s;
  }
}
