"use client";

import { normalizeBrandHex } from "@/app/lib/brandTheme";

/**
 * Typing indicator: animated dots only (no “{Brand} is thinking” copy).
 * Slate + cream dots by default; brand primary when `primaryColor` resolves.
 * Used by main ChatBox (`displayName` + Sanity color) and embed widget (`brandSlug` + theme color).
 *
 * @param {"solid" | "outline"} [variant="solid"] — `outline`: minimal dots (widget); `solid`: filled pill (main chat).
 */
export default function ChatThinkingRow({
  className = "",
  /** @deprecated Kept for call-site compatibility; dots-only UI does not show a brand name. */
  displayName: _displayName,
  /** @deprecated Kept for call-site compatibility. */
  brandSlug: _brandSlug,
  /** Raw hex from Sanity / theme API */
  primaryColor,
  variant = "solid",
}) {
  const hex = normalizeBrandHex(primaryColor);
  const themed = Boolean(hex);
  const outline = variant === "outline";

  if (outline) {
    return (
      <div className={`flex justify-start ${className}`.trim()}>
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="inline-flex select-none items-center gap-0.5 py-0.5"
          style={themed ? { color: hex } : undefined}
        >
          <span className="sr-only">Loading reply</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={
                themed
                  ? "h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-[0.5] motion-safe:animate-bounce motion-reduce:animate-pulse dark:opacity-[0.58]"
                  : "h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400/85 motion-safe:animate-bounce motion-reduce:animate-pulse dark:bg-neutral-500/90"
              }
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const dotClassSolidThemed =
    "h-2 w-2 rounded-full bg-white/90 motion-safe:animate-pulse";
  const dotClassSolidFallback =
    "h-2 w-2 rounded-full bg-[#FFEED8] motion-safe:animate-pulse";

  const shellClassName = `w-fit max-w-full cursor-default rounded-2xl px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md ${
    themed ? "" : "bg-[#59646F]"
  }`;
  const shellStyle = themed ? { backgroundColor: hex } : undefined;
  const dotClass = themed ? dotClassSolidThemed : dotClassSolidFallback;

  return (
    <div className={`flex justify-start ${className}`.trim()}>
      <div
        className={shellClassName}
        style={shellStyle}
        aria-live="polite"
        aria-busy="true"
        title="Loading"
      >
        <span className="sr-only">Loading reply</span>
        <div className="flex gap-1">
          <div className={dotClass} />
          <div
            className={dotClass}
            style={{ animationDelay: "0.3s" }}
          />
          <div
            className={dotClass}
            style={{ animationDelay: "0.6s" }}
          />
        </div>
      </div>
    </div>
  );
}
