"use client";
import { X } from "lucide-react";

export default function DocumentViewModal({ isOpen, onClose, document }) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-muted-bg px-8 py-6">
          <h2 className="text-2xl font-bold tracking-tight text-highlight">
            {document.title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background px-8 py-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed text-muted">
                {document.text || "No content available"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-card px-8 py-5">
          <button
            onClick={onClose}
            className="rounded-xl bg-highlight px-6 py-2.5 font-medium text-white shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
