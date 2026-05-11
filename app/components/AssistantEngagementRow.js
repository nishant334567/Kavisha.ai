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
                className={`inline-flex items-center justify-center rounded-lg border border-border/60 bg-background/80 p-2 transition hover:bg-muted-bg ${pending ? "opacity-50" : ""}`}
            >
                <ThumbsUp
                    className={`h-3.5 w-3.5 text-[#18A6B8] ${liked ? "fill-[#18A6B8]" : "fill-none"}`}
                    strokeWidth={2}
                    aria-hidden
                />
            </button>
        </div>
    );
}
