"use client";
import { X } from "lucide-react";

export default function ChunkModal({ isOpen, onClose, chunk }) {
  if (!isOpen || !chunk) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card p-6 text-foreground">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-highlight">Source Chunk</h3>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="mb-4">
          <p className="font-mono text-xs text-muted">ID: {chunk.id}</p>
        </div>
        {chunk.title && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">
              Title: {chunk.title}
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto mb-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {chunk.text || "No text available"}
          </p>
        </div>
        <div className="flex justify-end border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-md bg-muted-bg px-4 py-2 text-foreground transition-colors hover:bg-card"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
