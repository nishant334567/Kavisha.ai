"use client";

import { X } from "lucide-react";

export default function CommunityPostDialog({ name, description, date, requirement, onClose, onConnect, connectLabel = "Connect", isOwnPost = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div
        className="bg-card border border-border shadow-2xl rounded-xl font-fredoka w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-border shrink-0">
          <h2 className="text-xl sm:text-2xl md:text-3xl text-[#3D5E6B] break-words pr-8">
            {name || "—"}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-full p-1.5 text-muted hover:text-foreground hover:bg-muted-bg transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="inline-flex rounded-full border border-border bg-muted-bg overflow-hidden mb-4">
            <span className="px-2.5 py-1 text-xs sm:text-sm text-foreground">Looking for</span>
            <span className="px-2.5 py-1 text-xs sm:text-sm text-foreground bg-teal-100/80">
              {requirement || "—"}
            </span>
          </div>
          <p className="text-sm text-foreground font-extralight whitespace-pre-wrap break-words">
            {description || "No description."}
          </p>
          {date && (
            <p className="text-xs text-muted mt-4 pt-3 border-t border-border">
              {date}
            </p>
          )}
        </div>
        <div className="p-4 sm:p-6 border-t border-border shrink-0 flex items-center gap-3">
          {!isOwnPost && (
            <button
              type="button"
              className="flex-1 rounded-full bg-[#3D5E6B] text-white px-4 py-2 text-sm hover:bg-[#2d4e5b] transition-colors"
              onClick={() => {
                onConnect?.();
                onClose();
              }}
            >
              {connectLabel}
            </button>
          )}
          <button
            type="button"
            className="flex-1 rounded-full border border-border bg-muted-bg text-foreground px-4 py-2 text-sm hover:bg-border/50 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
