"use client";

import { Loader2, Maximize2 } from "lucide-react";

export default function WebsiteScrapeJobBar({
  job,
  saving = false,
  onExpand,
}) {
  if (!job) return null;

  const { trainedCount, totalCount, status } = job;
  const running = status === "pending" || status === "running";
  const discovered = status === "discovered" || status === "stopped";
  const complete = status === "completed";

  let percent = 0;
  let labelLeft = "";
  let expandLabel = "Open links";

  if (running || saving) {
    percent =
      totalCount > 0
        ? Math.round(((trainedCount ?? 0) / totalCount) * 100)
        : 0;
    labelLeft = `${trainedCount ?? 0} / ${totalCount} trained`;
    expandLabel = "View progress";
  } else if (complete) {
    percent = 100;
    labelLeft = `${trainedCount ?? 0} trained`;
    expandLabel = "Review pages";
  } else if (discovered) {
    labelLeft = `${totalCount} links found`;
    expandLabel = "Choose pages";
  }

  return (
    <div
      className="website-scrape-card rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted-bg/40 p-5 transition-shadow duration-300 hover:shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{labelLeft}</p>
          {(running || saving) && (
            <p className="mt-0.5 text-xs text-muted">Training in background</p>
          )}
          {discovered && !running && (
            <p className="mt-0.5 text-xs text-muted">
              Select up to 100 per batch
            </p>
          )}
        </div>
        {(running || saving) && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-highlight/10 px-2.5 py-1 text-xs font-medium text-highlight">
            <Loader2 className="h-3 w-3 animate-spin" />
            {percent}%
          </span>
        )}
      </div>

      {(running || saving) && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-border/80">
          <div
            className="website-progress-bar h-full rounded-full bg-gradient-to-r from-highlight/80 to-highlight"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onExpand}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-highlight px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-highlight/90 hover:shadow-lg active:scale-[0.99]"
      >
        <Maximize2 className="h-4 w-4" />
        {expandLabel}
      </button>
    </div>
  );
}
