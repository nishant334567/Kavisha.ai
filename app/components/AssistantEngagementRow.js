"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function AssistantEngagementRow({
    logId,
    liked = false,
    onUpdated,
    className = "",
}) {
    const [pending, setPending] = useState(false);

    if (!logId) return null;

    const toggleLike = async () => {
        if (pending) return;
        setPending(true);
        try {
            const res = await fetch(`/api/logs/message/${logId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: liked ? "unlike" : "like" }),
                credentials: "same-origin",
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && onUpdated) {
                onUpdated({
                    liked: Boolean(data.liked),
                    copied: Boolean(data.copied),
                });
            }
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
                aria-pressed={liked}
                aria-label={liked ? "Unlike this answer" : "Like this answer"}
                onClick={() => void toggleLike()}
                className={`inline-flex items-center justify-center rounded-md bg-transparent p-2 text-foreground transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08] ${pending ? "opacity-50" : ""}`}
            >
                <ThumbsUp
                    className={`h-4 w-4 shrink-0 text-foreground ${liked ? "fill-foreground" : "fill-none"}`}
                    strokeWidth={2}
                    aria-hidden
                />
            </button>
        </div>
    );
}
