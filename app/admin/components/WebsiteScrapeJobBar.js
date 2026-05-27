"use client";

import { Loader2, Maximize2, X } from "lucide-react";

export default function WebsiteScrapeJobBar({
  job,
  saving = false,
  saveProgress = null,
  onExpand,
  onDismiss,
}) {
  if (!job) return null;

  const { doneCount, totalCount, scrapedCount, status } = job;
  const running = status === "pending" || status === "running";
  const complete = status === "completed";

  let percent = 0;
  let labelLeft = "";

  if (saving && saveProgress) {
    percent =
      saveProgress.total > 0
        ? Math.round((saveProgress.done / saveProgress.total) * 100)
        : 0;
    labelLeft = `Saving ${saveProgress.done} of ${saveProgress.total}`;
  } else if (running) {
    percent =
      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    labelLeft = "Scraping";
  } else if (complete) {
    percent = 100;
    labelLeft = `Scrape finished · ${scrapedCount ?? doneCount} ready to save`;
  }

  return (
    <div
      className="mt-auto flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5 truncate pr-2">
            {(running || saving) && (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-highlight" />
            )}
            {labelLeft}
          </span>
          <span className="shrink-0">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              saving ? "bg-green-600" : "bg-highlight"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-lg border border-border p-2.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          aria-label={
            saving
              ? "Expand save progress"
              : complete
                ? "Open pages to save"
                : "Expand scrape progress"
          }
          title={
            saving
              ? "Expand"
              : complete
                ? "Open pages to save"
                : "Expand"
          }
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        {complete && !saving && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-border p-2.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
            aria-label="Dismiss"
            title="Dismiss — use if you already saved or want to start over"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
