"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore, X } from "lucide-react";

export default function BrandInbox({
  brand,
  onOpenChat,
  onClose,
}) {
  const brandKey = String(brand || "").trim().toLowerCase();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!brandKey) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/brand-inbox?brand=${encodeURIComponent(brandKey)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data.conversations)) {
          setRows(data.conversations);
        } else if (!cancelled) {
          setRows([]);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandKey]);

  const items = useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-muted-bg px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircleMore className="h-5 w-5 shrink-0 text-highlight" />
          <p className="truncate text-sm font-semibold text-foreground">
            Brand Inbox
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-background/70"
          aria-label="Close inbox"
        >
          <X className="h-4 w-4 text-muted" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-6 text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted">
            No brand chats yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((c) => (
              <button
                key={c.connectionId}
                type="button"
                className="w-full px-4 py-3 text-left transition hover:bg-muted-bg"
                onClick={() =>
                  onOpenChat({
                    connectionId: c.connectionId,
                    endUserId: c.endUserId,
                    otherUser: c.otherUser,
                    otherUserEmail: c.otherUserEmail,
                  })
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.otherUser}
                    </p>
                    {c.otherUserEmail ? (
                      <p className="truncate text-xs text-muted">
                        {c.otherUserEmail}
                      </p>
                    ) : null}
                    {c.lastMessage ? (
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        {c.lastMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

