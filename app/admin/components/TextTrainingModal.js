"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function TextTrainingModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = "",
  initialContent = "",
  isEditMode = false,
  folders = [],
  folderId = "",
  onFolderChange,
  initialSourceUrl = "",
  isSaving = false,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setSourceUrl(initialSourceUrl);
    } else {
      setTitle("");
      setContent("");
      setSourceUrl("");
    }
  }, [isOpen, initialTitle, initialContent, initialSourceUrl]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (onSave && title && content) {
      await onSave({
        title,
        content,
        ...(onFolderChange && { folderId: folderId ?? "" }),
        sourceUrl: sourceUrl || "",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted-bg px-8 py-6">
          <h2 className="text-2xl font-bold tracking-tight text-highlight">
            {isEditMode ? "Edit Document" : "Text Based Training"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-muted transition-all duration-200 hover:bg-card hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-background px-8 py-6">
          <div>
            <label className="mb-3 block text-sm font-semibold tracking-wide text-foreground">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              placeholder="Enter document title"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground transition-all duration-200 placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {onFolderChange && (
            <div>
              <label className="mb-3 block text-sm font-semibold tracking-wide text-foreground">
                Folder
              </label>
              <select
                value={folderId}
                onChange={(e) => onFolderChange(e.target.value)}
                disabled={isSaving}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground transition-all duration-200 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Unfiled</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-3 block text-sm font-semibold tracking-wide text-foreground">
              Source URL <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={isSaving}
              placeholder="https://example.com/article"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground transition-all duration-200 placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-3 block text-sm font-semibold tracking-wide text-foreground">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
              placeholder="Enter your content here..."
              rows={14}
              className="w-full resize-none rounded-xl border border-border bg-input px-4 py-3 leading-relaxed text-foreground transition-all duration-200 placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border bg-card px-8 py-5">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-border bg-card px-6 py-2.5 font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title || !content || isSaving}
            className="rounded-xl bg-highlight px-6 py-2.5 font-medium text-white shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg"
          >
            {isSaving ? "Training..." : isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
