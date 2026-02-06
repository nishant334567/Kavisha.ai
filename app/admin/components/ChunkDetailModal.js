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
      className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {displayChunk ? "Chunk details" : "Full document"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 text-sm text-gray-800">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : chunk ? (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</p>
                <p className="mt-0.5 break-all font-mono text-xs">{chunk.id}</p>
              </div>
              {displayTitle != null && displayTitle !== "" && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</p>
                  <p className="mt-0.5">{displayTitle}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Text</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{displayText}</p>
              </div>
            </>
          ) : null}
        </div>
        {chunk && !loading && (
          <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2">
            {hasDoc && (
              <button
                type="button"
                onClick={() => setShowFullText((v) => !v)}
                className="flex-1 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-1.5"
                aria-label={showFullText ? "Show chunk text only" : "Show full document text"}
              >
                <FileText className="w-4 h-4" />
                {showFullText ? "Show chunk text" : "Show full text"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
