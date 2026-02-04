"use client";

import { X } from "lucide-react";

export default function ChunkDetailModal({
  open,
  loading,
  chunk,
  onClose,
}) {
  if (!open) return null;

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
          <h3 className="text-sm font-semibold text-gray-900">Chunk details</h3>
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
              {chunk.title != null && chunk.title !== "" && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</p>
                  <p className="mt-0.5">{chunk.title}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Text</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{chunk.text || "—"}</p>
              </div>
            </>
          ) : null}
        </div>
        {chunk && !loading && (
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
