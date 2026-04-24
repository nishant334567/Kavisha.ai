"use client";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/**
 * Public avatar hero: fixed 3:1 frame, object-fit cover, optional zoom + focal point from Sanity.
 */
export default function BrandHeroImageFrame({
  imageUrl,
  alt,
  zoom = 1,
  focusX = 50,
  focusY = 50,
  className = "",
  /** Optional nudge after scale, e.g. -2.5 for ~2.5% up (preview-only). */
  translateYPercent = 0,
}) {
  if (!imageUrl) return null;

  const z = clamp(zoom, 1, 3);
  const fx = clamp(focusX, 0, 100);
  const fy = clamp(focusY, 0, 100);
  const ty = Number(translateYPercent);
  const translate =
    Number.isFinite(ty) && ty !== 0 ? ` translateY(${ty}%)` : "";

  return (
    <div
      className={`relative aspect-[3/1] w-full overflow-hidden bg-background ${className}`.trim()}
    >
      {/* absolute + block: fills aspect box exactly (no inline-img baseline gap under the image). */}
      <img
        src={imageUrl}
        alt={alt}
        className="absolute inset-0 block h-full w-full object-cover"
        style={{
          objectPosition: `${fx}% ${fy}%`,
          transform: `scale(${z})${translate}`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
