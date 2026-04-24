"use client";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/**
 * Public avatar hero: fixed 3:1 frame, object-fit cover, optional zoom + focal point from Sanity.
 * When zoom > 1, extra translate from focus unlocks pan even if object-position had no horizontal
 * slack at 1× (cover + scale interaction).
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
  const extraY =
    Number.isFinite(ty) && ty !== 0 ? ty : 0;

  const panBoost = Math.max(0, z - 1);
  const panCoeff = 32;
  const panX = ((50 - fx) / 50) * panBoost * panCoeff;
  const panY = ((50 - fy) / 50) * panBoost * panCoeff + extraY;

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
          transform: `scale(${z}) translateX(${panX}%) translateY(${panY}%)`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
