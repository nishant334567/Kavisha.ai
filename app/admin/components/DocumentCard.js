"use client";
import { MoreVertical } from "lucide-react";

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

  const card = (
    <div
      onClick={() => onView(doc.docid)}
      className="cursor-pointer overflow-visible rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="px-4 py-3 flex items-center justify-between gap-2 relative">
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(openMenuId === doc._id ? null : doc._id);
          }}
          className="text-highlight hover:opacity-80"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {openMenuId === doc._id && (
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
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted">Loading...</div>
          </div>
        ) : (
          <p className="line-clamp-6 text-sm text-muted">
            {doc.text?.substring(0, 200) || ""}
          </p>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectionMode && (
            <input
              type="checkbox"
              checked={!!isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggleSelect()}
              className="shrink-0 rounded border-border text-highlight focus:ring-highlight"
            />
          )}
          <span className="text-xs text-muted">You added</span>
        </div>
        <span className="text-xs text-muted">
          {formatDate(doc.createdAt)}
        </span>
      </div>
    </div>
  );

  return card;
}
