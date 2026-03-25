"use client";

import { useState, useCallback } from "react";
import { Mail, X, Send, FileText, Loader2 } from "lucide-react";

function escapePreviewTitle(str) {
  if (typeof str !== "string") return "Preview";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PREVIEW_API = "/api/admin/send-blog-email";

export default function ShareAsEmailButton({
  slug,
  brand,
  title,
  variant = "row",
  className = "",
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const openModal = useCallback(async () => {
    if (!slug || !brand) return;
    setModalOpen(true);
    setResult(null);
    setPreview(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brand: brand.trim().toLowerCase(),
        slug: slug.trim(),
      });
      const res = await fetch(`${PREVIEW_API}?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setPreview({
          recipients: data.recipients || [],
          totalCount: data.totalCount ?? 0,
          skippedUnsubscribed: data.skippedUnsubscribed ?? 0,
          previewHtml: data.previewHtml || "",
          title: data.title || title || "Blog post",
        });
      } else {
        setResult({ ok: false, message: data.error || "Failed to load recipients" });
      }
    } catch (e) {
      setResult({ ok: false, message: e?.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  }, [slug, brand, title]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setPreview(null);
    setResult(null);
    setSending(false);
  }, []);

  const handlePreview = useCallback(() => {
    if (!preview?.previewHtml) return;
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email preview – ${escapePreviewTitle(preview.title || "Blog post")}</title></head><body style="margin:0;padding:20px;background:#e5e7eb;">${preview.previewHtml}</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(doc);
      w.document.close();
    }
  }, [preview?.previewHtml, preview?.title]);

  const handleSend = useCallback(async () => {
    if (!slug || !brand || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(PREVIEW_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          brand: brand.trim().toLowerCase(),
          slug: slug.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          ok: true,
          message: data.message || `Sent to ${data.sentCount ?? 0} recipient(s).`,
        });
      } else {
        setResult({ ok: false, message: data.error || "Failed to send" });
      }
    } catch (e) {
      setResult({ ok: false, message: e?.message || "Request failed" });
    } finally {
      setSending(false);
    }
  }, [slug, brand, sending]);

  const trigger =
    variant === "dropdown" ? (
      <button
        type="button"
        onClick={openModal}
        disabled={!slug || !brand}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted-bg disabled:opacity-60"
        aria-label="Share as email"
      >
        <Mail className="h-4 w-4" />
        Share as email
      </button>
    ) : (
      <button
        type="button"
        onClick={openModal}
        disabled={!slug || !brand}
        className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-muted transition-colors hover:bg-muted-bg hover:text-foreground disabled:opacity-60"
        aria-label="Share as email"
        title="Email this post to everyone who has chatted with the avatar"
      >
        <Mail className="h-4 w-4" />
      </button>
    );

  return (
    <>
      {variant === "dropdown" ? trigger : <div className={`flex flex-wrap items-center gap-2 ${className}`}>{trigger}</div>}
      {modalOpen && (
        <ShareEmailModal
          loading={loading}
          preview={preview}
          result={result}
          sending={sending}
          onClose={closeModal}
          onPreview={handlePreview}
          onSend={handleSend}
        />
      )}
    </>
  );
}

function ShareEmailModal({
  loading,
  preview,
  result,
  sending,
  onClose,
  onPreview,
  onSend,
}) {
  const count = preview?.totalCount ?? 0;
  const recipients = preview?.recipients ?? [];
  const showRecipients = recipients.length > 0 && recipients.length <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-email-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="share-email-title" className="text-lg font-semibold text-foreground">
            Share as email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-muted-bg hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading recipients…</span>
            </div>
          )}

          {!loading && result?.ok && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {result.message}
            </p>
          )}
          {!loading && result && !result.ok && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {result.message}
            </p>
          )}

          {!loading && preview && !result?.ok && (
            <>
              <p className="text-sm text-muted">
                This will send &quot;{preview.title}&quot; to{" "}
                <strong>{count}</strong> recipient{count !== 1 ? "s" : ""}
                {preview.skippedUnsubscribed > 0 && (
                  <span className="text-muted">
                    {" "}({preview.skippedUnsubscribed} unsubscribed excluded)
                  </span>
                )}
                .
              </p>

              {count === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  No recipients. Only people who have chatted with this avatar will receive the email.
                </p>
              ) : (
                <>
                  {showRecipients && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted-bg">
                      <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted">
                        Recipients
                      </p>
                      <ul className="divide-y divide-border px-3 py-2 text-sm text-foreground">
                        {recipients.map((r) => (
                          <li key={r.email} className="py-1.5 truncate">
                            {r.name && r.name !== r.email ? `${r.name} <${r.email}>` : r.email}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recipients.length > 50 && (
                    <p className="text-xs text-muted">
                      Recipients: {recipients.slice(0, 3).map((r) => r.email).join(", ")} … and{" "}
                      {recipients.length - 3} more
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {!loading && preview && !result?.ok && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onPreview}
              disabled={!preview.previewHtml}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={sending || count === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2D545E] px-4 py-2 text-sm font-medium text-white hover:bg-[#24454E] disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send to {count} recipient{count !== 1 ? "s" : ""}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
            >
              Cancel
            </button>
          </div>
        )}

        {(loading || result?.ok) && (
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-bg"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
