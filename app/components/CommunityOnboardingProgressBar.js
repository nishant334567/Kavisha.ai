"use client";

import { hexToRgba } from "@/app/lib/brandTheme";

function getFill(percent, complete, primaryBrandHex) {
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  const transition = "width 0.55s cubic-bezier(0.22, 1, 0.36, 1)";

  if (complete && primaryBrandHex) {
    return {
      className: "h-full rounded-full",
      style: {
        width,
        transition,
        background: `linear-gradient(90deg, ${primaryBrandHex}, rgb(16 185 129))`,
      },
    };
  }
  if (complete && !primaryBrandHex) {
    return {
      className:
        "h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500",
      style: { width, transition },
    };
  }
  if (primaryBrandHex) {
    const soft = hexToRgba(primaryBrandHex, 0.82) || primaryBrandHex;
    const glow = hexToRgba(primaryBrandHex, 0.22);
    return {
      className: "h-full rounded-full",
      style: {
        width,
        transition,
        background: `linear-gradient(90deg, ${primaryBrandHex}, ${soft})`,
        ...(glow ? { boxShadow: `0 0 10px ${glow}` } : {}),
      },
    };
  }
  return {
    className:
      "h-full rounded-full bg-gradient-to-r from-[#59646F] to-[#7c8a96]",
    style: { width, transition },
  };
}

/**
 * Thin track + fill for community onboarding (0–100).
 */
export default function CommunityOnboardingProgressBar({
  value,
  complete,
  primaryBrandHex,
}) {
  const pct = Math.max(0, Math.min(100, value));
  const { className, style } = getFill(pct, complete, primaryBrandHex);

  return (
    <div
      className="h-1.5 w-full rounded-full bg-foreground/[0.08] dark:bg-white/[0.1]"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pct} percent complete`}
    >
      <div className={className} style={style} />
    </div>
  );
}
