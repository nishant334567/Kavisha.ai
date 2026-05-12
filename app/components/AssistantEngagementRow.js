"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function AssistantEngagementRow({
  logId,
  liked = false,
  onUpdated,
  className = "",
}) {
  const [pending, setPending] = useState(false);
  /** Until parent `liked` updates, keep instant feedback after click */
  const [optimisticLiked, setOptimisticLiked] = useState(null);

  useEffect(() => {
    setOptimisticLiked(null);
  }, [liked, logId]);

  if (!logId) return null;

  const visibleLiked =
    optimisticLiked !== null ? optimisticLiked : Boolean(liked);

  const toggleLike = async () => {
    if (pending) return;
    const next = !visibleLiked;
    setOptimisticLiked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/logs/message/${logId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: next ? "like" : "unlike" }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && onUpdated) {
        onUpdated({
          liked: Boolean(data.liked),
          copied: Boolean(data.copied),
        });
      } else {
        setOptimisticLiked(null);
      }
    } catch {
      setOptimisticLiked(null);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${className}`.trim()}
    >
      <button
        type="button"
        disabled={pending}
        aria-pressed={visibleLiked}
        aria-label={visibleLiked ? "Unlike this answer" : "Like this answer"}
        onClick={() => void toggleLike()}
        className={`inline-flex items-center justify-center rounded-md bg-transparent p-2 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08] ${pending ? "opacity-50" : ""} ${
          visibleLiked
            ? "text-black [&>svg]:!stroke-black [&>svg]:!fill-black [&_path]:!stroke-black [&_path]:!fill-black dark:text-white dark:[&>svg]:!stroke-white dark:[&>svg]:!fill-white dark:[&_path]:!stroke-white dark:[&_path]:!fill-white"
            : "text-foreground [&>svg]:!stroke-currentColor [&>svg]:!fill-none [&_path]:!stroke-currentColor [&_path]:!fill-none"
        }`}
      >
        <ThumbsUp className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
