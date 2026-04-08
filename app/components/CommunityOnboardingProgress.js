"use client";

import { Check } from "lucide-react";
import CommunityOnboardingProgressBar from "./CommunityOnboardingProgressBar";

/**
 * Minimal community onboarding indicator — sits above the message list.
 */
export default function CommunityOnboardingProgress({
  percent,
  primaryBrandHex,
}) {
  const pct = Math.max(0, Math.min(100, percent));
  const complete = pct >= 100;
  const remaining = Math.max(0, 100 - pct);

  return (
    <div
      className="mb-3 shrink-0 w-full px-0.5 md:px-1"
      role="region"
      aria-label="Community profile onboarding progress"
    >
      <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 backdrop-blur-[2px]">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-xs font-medium text-foreground leading-none">
            {complete ? (
              <span className="inline-flex items-center gap-1.5">
                <Check
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
                Profile complete
              </span>
            ) : (
              "Community profile"
            )}
          </p>
          {!complete && (
            <p className="text-[11px] text-muted tabular-nums leading-none shrink-0">
              <span className="text-foreground/90 font-medium">{pct}%</span>
              <span className="text-muted"> · </span>
              <span>~{remaining}% left</span>
            </p>
          )}
        </div>
        <CommunityOnboardingProgressBar
          value={pct}
          complete={complete}
          primaryBrandHex={primaryBrandHex}
        />
        {complete && (
          <p className="mt-2 text-[11px] text-muted leading-snug">
            Ready for matching.
          </p>
        )}
      </div>
    </div>
  );
}
