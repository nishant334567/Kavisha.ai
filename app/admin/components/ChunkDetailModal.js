"use client";

import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";

export default function ChunkDetailModal({
  open,
  loading,
  chunk,
  document: doc,
  onClose,
}) {
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    if (!open || !chunk) setShowFullText(false);
  }, [open, chunk?.id]);

  if (!open) return null;

  const hasDoc = doc?.text != null && doc.text !== "";
  const displayChunk = !showFullText || !hasDoc;
  const displayText = displayChunk ? (chunk?.text || "—") : doc.text;
  const displayTitle = displayChunk ? chunk?.title : doc?.title;

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-3 sm:p-4">
          <h3 className="text-sm font-semibold text-highlight">
            {displayChunk ? "Chunk details" : "Full document"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 hover:bg-muted-bg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-sm text-foreground sm:p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-highlight border-t-transparent" />
            </div>
          ) : chunk ? (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">ID</p>
                <p className="mt-0.5 break-all font-mono text-xs">{chunk.id}</p>
              </div>
              {displayTitle != null && displayTitle !== "" && (
                <div className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Title</p>
                  <p className="mt-0.5">{displayTitle}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Text</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-muted">{displayText}</p>
              </div>
            </>
          ) : null}
        </div>
        {chunk && !loading && (
          <div className="flex gap-2 border-t border-border p-3 sm:p-4">
            {hasDoc && (
              <button
                type="button"
                onClick={() => setShowFullText((v) => !v)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                aria-label={showFullText ? "Show chunk text only" : "Show full document text"}
              >
                <FileText className="w-4 h-4" />
                {showFullText ? "Show chunk text" : "Show full text"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-muted-bg px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
