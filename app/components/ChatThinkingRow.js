"use client";

import { normalizeBrandHex } from "@/app/lib/brandTheme";

function titleCaseFromSlug(brandSlug) {
  const s = String(brandSlug || "").trim();
  if (!s) return "Assistant";
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function resolveLabel(displayName, brandSlug) {
  const d = String(displayName ?? "").trim();
  if (d) return d;
  return titleCaseFromSlug(brandSlug);
}

/**
 * “{Brand} is thinking” strip: slate + cream dots by default; brand primary when `primaryColor` resolves.
 * Used by main ChatBox (`displayName` + Sanity color) and embed widget (`brandSlug` + theme color).
 *
 * @param {"solid" | "outline"} [variant="solid"] — `outline`: border + text in brand color, no brand fill (widget).
 */
export default function ChatThinkingRow({
  className = "",
  /** Prefer human name from Sanity, e.g. brandContext.brandName */
  displayName,
  /** Subdomain slug when displayName is empty (widget) */
  brandSlug,
  /** Raw hex from Sanity / theme API */
  primaryColor,
  variant = "solid",
}) {
  const name = resolveLabel(displayName, brandSlug);
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

  const textClassSolidThemed = "text-sm font-medium text-white";
  const textClassSolidFallback = "text-sm font-medium text-[#FFEED8]";
  const textClassOutlineFallback =
    "text-sm font-medium text-[#59646F] dark:text-muted-foreground";

  let shellClassName;
  let shellStyle;
  let dotClass;
  let dotStyleExtra;
  let textClass;
  let textStyle;

  if (outline) {
    shellClassName = `w-fit max-w-full cursor-default rounded-2xl border-2 bg-background/90 px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-card/90 ${
      themed ? "" : "border-[#59646F]"
    }`;
    shellStyle = themed ? { borderColor: hex } : undefined;
    dotClass = themed ? dotClassOutlineThemed : dotClassOutlineFallback;
    dotStyleExtra = themed ? { backgroundColor: hex } : undefined;
    textClass = themed ? "text-sm font-medium" : textClassOutlineFallback;
    textStyle = themed ? { color: hex } : undefined;
  } else {
    shellClassName = `w-fit max-w-full cursor-default rounded-2xl px-4 py-2 shadow-sm transition-all duration-300 hover:shadow-md ${
      themed ? "" : "bg-[#59646F]"
    }`;
    shellStyle = themed ? { backgroundColor: hex } : undefined;
    dotClass = themed ? dotClassSolidThemed : dotClassSolidFallback;
    dotStyleExtra = undefined;
    textClass = themed ? textClassSolidThemed : textClassSolidFallback;
    textStyle = undefined;
  }

  return (
    <div className={`flex justify-start ${className}`.trim()}>
      <div
        className={shellClassName}
        style={shellStyle}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-wrap items-center gap-3">
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
          <span className={textClass} style={textStyle}>
            {name} is thinking
          </span>
        </div>
      </div>
    </div>
  );
}
