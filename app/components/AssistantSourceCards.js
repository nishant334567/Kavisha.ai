"use client";

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

/**
 * Horizontally scrollable source cards (KB title/description). Whole card is the link.
 * Row uses full width of the parent; cards keep a fixed max width and scroll sideways.
 */
export default function AssistantSourceCards({ items, primaryHex = null }) {
  const list = Array.isArray(items)
    ? items.filter((c) => c && typeof c.url === "string" && c.url.trim())
    : [];
  if (list.length === 0) return null;

  return (
    <div className="mt-2 w-full min-w-0 border-t border-border/25 pt-2 dark:border-border/30">
      <p className="mb-1.5 text-xs text-muted">Sources</p>
      <div className="-mx-1 flex w-full min-w-0 gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
        {list.map((c, idx) => {
          const url = c.url.trim();
          const title =
            (typeof c.title === "string" && c.title.trim()) ||
            hostFromUrl(url) ||
            "Source";
          const desc =
            typeof c.description === "string" ? c.description.trim() : "";
          const host = hostFromUrl(url);
          return (
            <a
              key={`${url}-${idx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[min(260px,78vw)] shrink-0 rounded-lg border border-border/50 bg-card/90 px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted-bg/50 dark:border-border/40"
              style={
                primaryHex
                  ? { borderLeft: `3px solid ${primaryHex}` }
                  : undefined
              }
            >
              <span className="line-clamp-2 text-sm font-medium text-foreground">
                {title}
              </span>
              {desc ? (
                <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {desc}
                </span>
              ) : null}
              {host ? (
                <span className="mt-1 block truncate text-[11px] text-muted">
                  {host}
                </span>
              ) : null}
            </a>
          );
        })}
      </div>
    </div>
  );
}
