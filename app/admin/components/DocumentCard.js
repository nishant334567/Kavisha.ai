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
}) {
  return (
    <div
      onClick={() => onView(doc.docid)}
      className="bg-white rounded-lg border border-blue-200 overflow-visible shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="bg-blue-50 px-4 py-3 flex items-center justify-between rounded-t-lg relative">
        <h3 className="font-semibold text-blue-900 text-sm">{doc.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId(openMenuId === doc._id ? null : doc._id);
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {openMenuId === doc._id && (
          <div className="absolute right-0 top-10 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(doc.docid);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              View
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(doc);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit
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
      <div className="p-4 min-h-[200px] border-b border-blue-100 bg-white">
        {loadingDocumentId === doc.docid ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 line-clamp-6">
            {doc.text?.substring(0, 200) || ""}
          </p>
        )}
      </div>
      <div className="bg-blue-50 px-4 py-3 flex items-center justify-between rounded-b-lg">
        <span className="text-xs text-blue-900">
          You added {formatDate(doc.createdAt)}
        </span>
      </div>
    </div>
  );
}
