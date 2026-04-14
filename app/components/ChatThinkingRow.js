"use client";

import { normalizeBrandHex } from "@/app/lib/brandTheme";

/**
 * Typing indicator: animated dots only (no “{Brand} is thinking” copy).
 * Slate + cream dots by default; brand primary when `primaryColor` resolves.
 * Used by main ChatBox (`displayName` + Sanity color) and embed widget (`brandSlug` + theme color).
 *
 * @param {"solid" | "outline"} [variant="solid"] — `outline`: border + dots in brand color, no brand fill (widget).
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

  const dotClassSolidThemed =
    "h-2 w-2 rounded-full bg-white/90 motion-safe:animate-pulse";
  const dotClassSolidFallback =
    "h-2 w-2 rounded-full bg-[#FFEED8] motion-safe:animate-pulse";
  const dotClassOutlineThemed =
    "h-2 w-2 rounded-full motion-safe:animate-pulse";
  const dotClassOutlineFallback =
    "h-2 w-2 rounded-full bg-[#59646F] motion-safe:animate-pulse";

  let shellClassName;
  let shellStyle;
  let dotClass;
  let dotStyleExtra;

  if (outline) {
    shellClassName = `w-fit max-w-full cursor-default rounded-2xl border-2 bg-background/90 px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-card/90 ${
      themed ? "" : "border-[#59646F]"
    }`;
    shellStyle = themed ? { borderColor: hex } : undefined;
    dotClass = themed ? dotClassOutlineThemed : dotClassOutlineFallback;
    dotStyleExtra = themed ? { backgroundColor: hex } : undefined;
  } else {
    shellClassName = `w-fit max-w-full cursor-default rounded-2xl px-3 py-2 shadow-sm transition-all duration-300 hover:shadow-md ${
      themed ? "" : "bg-[#59646F]"
    }`;
    shellStyle = themed ? { backgroundColor: hex } : undefined;
    dotClass = themed ? dotClassSolidThemed : dotClassSolidFallback;
    dotStyleExtra = undefined;
  }

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
          <div className={dotClass} style={dotStyleExtra} />
          <div
            className={dotClass}
            style={{ ...dotStyleExtra, animationDelay: "0.3s" }}
          />
          <div
            className={dotClass}
            style={{ ...dotStyleExtra, animationDelay: "0.6s" }}
          />
        </div>
      </div>
    </div>
  );
}
