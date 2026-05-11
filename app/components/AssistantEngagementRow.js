"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";

export default function AssistantEngagementRow({
    logId,
    likeCount = 0,
    onUpdated,
    className = "",
}) {
    const [pending, setPending] = useState(false);

    if (!logId) return null;

    const postLike = async () => {
        if (pending) return;
        setPending(true);
        try {
            const res = await fetch(`/api/logs/message/${logId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "like" }),
                credentials: "same-origin",
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && onUpdated) {
                onUpdated({
                    likeCount: Number(data.likeCount) || 0,
                    copyCount: Number(data.copyCount) || 0,
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
                onClick={() => void postLike()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2 py-1.5 transition hover:bg-muted-bg disabled:opacity-50"
            >
                <ThumbsUp className="h-3.5 w-3.5 text-[#18A6B8]" aria-hidden />
                <span className="tabular-nums text-[#18A6B8]">{likeCount}</span>
            </button>
        </div>
    );
}
