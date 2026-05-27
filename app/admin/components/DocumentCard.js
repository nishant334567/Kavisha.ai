"use client";
import { Check, MoreVertical } from "lucide-react";

export default function DocumentCard({
  doc,
  onView,
  onEdit,
  onDelete,
  openMenuId,
  setOpenMenuId,
  loadingDocumentId,
  formatDate,
  selectionMode,
  isSelected,
  onToggleSelect,
  folderName,
  trainingLocked = false,
}) {
  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect();
      return;
    }
    onView(doc.docid);
  };

  return (
    <div
      role={selectionMode ? "checkbox" : undefined}
      aria-checked={selectionMode ? isSelected : undefined}
      onClick={handleCardClick}
      className={`relative cursor-pointer overflow-visible rounded-lg border bg-card shadow-sm transition-all hover:shadow-md ${
        selectionMode && isSelected
          ? "border-highlight ring-2 ring-highlight/40"
          : "border-border"
      } ${selectionMode ? "hover:border-highlight/60" : ""}`}
    >
      {selectionMode && (
        <div
          className="absolute left-3 top-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onToggleSelect}
            aria-label={isSelected ? "Deselect document" : "Select document"}
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors ${
              isSelected
                ? "border-highlight bg-highlight text-white"
                : "border-border bg-card text-transparent hover:border-highlight/70"
            }`}
          >
            {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
          </button>
        </div>
      )}

      <div
        className={`px-4 py-3 flex items-center justify-between gap-2 relative ${
          selectionMode ? "pl-12" : ""
        }`}
      >
        <h3 className="min-w-0 truncate text-sm font-semibold text-highlight">
          {doc?.title?.toUpperCase()}
        </h3>
        {folderName && folderName !== "Unfiled" && (
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 cursor-default items-center rounded-md border border-border bg-muted-bg px-2 py-0.5 text-[10px] font-medium text-muted"
          >
            {folderName}
          </span>
        )}
        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === doc._id ? null : doc._id);
            }}
            className="text-highlight hover:opacity-80"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        {!selectionMode && openMenuId === doc._id && (
          <div className="absolute right-0 top-10 z-50 min-w-[120px] rounded-lg border border-border bg-card py-1 shadow-lg">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(doc.docid);
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted-bg"
            >
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(doc);
              }}
              disabled={trainingLocked}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted-bg disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted"
            >
              {trainingLocked ? "Edit disabled" : "Edit"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc.docid);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="mx-2 mb-2 min-h-[200px] rounded bg-muted-bg p-4">
        {loadingDocumentId === doc.docid ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-muted">Loading...</div>
          </div>
        ) : (
          <p className="line-clamp-6 text-sm text-muted">
            {doc.text?.substring(0, 200) || ""}
          </p>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-muted">You added</span>
        <span className="text-xs text-muted">{formatDate(doc.createdAt)}</span>
      </div>
    </div>
  );
}
