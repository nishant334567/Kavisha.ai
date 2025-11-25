"use client";

import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useState, useEffect } from "react";
export default function DocumentUploadCard({
  doc,
  toggleReadMore,
  expandedDocs,
  onDelete,
}) {
  const [editedDoctext, setEditedDoctext] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [chunkSize, setChunksize] = useState();
  const [saving, setSaving] = useState(false);
  const [documentData, setDocumentData] = useState({});

  const brandContext = useBrandContext();

  useEffect(() => {
    if (doc) setDocumentData(doc);
  }, [doc]);

  const handleEditDoc = (id) => {
    setEditedDoctext(documentData?.text || "");
    setChunksize(documentData?.chunkSize || 200);
    setIsEditing(true);
  };

  const refetchDocument = async (docid) => {
    try {
      const response = await fetch(
        `/api/admin/training-documents?docid=${docid}&brand=${brandContext?.subdomain}`
      );
      const data = await response.json();
      if (data.document) setDocumentData(data.document);
    } catch (err) {
      console.error("Failed to refetch document:", err);
    }
  };
  const handleSaveDoc = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/embeddings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docid: documentData?.docid,
          text: editedDoctext.trim(),
          brand: brandContext?.subdomain,
          chunkSize: chunkSize || documentData?.chunkSize || 200,
          title: documentData.title || "",
        }),
      });

      if (!response.ok) {
        setSaving(false);
        alert("Failed to update the document");
        return;
      }
      alert("Document updated successfully");
      await refetchDocument(documentData?.docid);
    } catch (err) {
      console.error("Update error:", err);
      alert(err.message || "Failed to update the document");
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  };

  return (
    <div
      key={documentData._id}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {documentData.title && (
            <div className="mb-2">
              <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-md inline-block">
                📄 {documentData.title}
              </span>
            </div>
          )}
          {/* DocID and Description Row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
              ID: {documentData.docid}
            </span>

            <span className="text-xs text-gray-500">
              {new Date(documentData.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        {isEditing ? (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <select
              value={chunkSize || documentData?.chunkSize || 200}
              onChange={(e) => setChunksize(parseInt(e.target.value))}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {[150, 200, 250, 300, 350, 400, 450, 500, 550, 600].map(
                (size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                )
              )}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDoc}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                title="Save changes"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedDoctext(documentData.text);
                  setChunksize(documentData?.chunkSize);
                }}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Cancel editing"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {documentData.chunkSize && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                {documentData.chunkSize} words
              </span>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => onDelete && onDelete(doc)}
                className="p-1.5 hover:bg-red-50 rounded-md transition-colors group"
                title="Delete document"
              >
                <img
                  src="/delete_2.png"
                  alt="Delete"
                  className="w-4 h-4 opacity-70 group-hover:opacity-100"
                />
              </button>
              <button
                onClick={() => handleEditDoc(documentData._id)}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                title="Edit document"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-3 pt-3 border-t border-gray-100 max-h-[300px] overflow-y-auto">
        {isEditing ? (
          <textarea
            className="w-full"
            value={editedDoctext}
            rows={4}
            onChange={(e) => setEditedDoctext(e.target.value)}
          />
        ) : (
          <p className="text-gray-700 text-sm leading-relaxed">
            {documentData?.text?.length > 400 &&
            !expandedDocs[documentData.docid]
              ? `${documentData.text.slice(0, 400)}...`
              : documentData.text}
          </p>
        )}
      </div>
      {documentData?.text?.length > 400 && (
        <button
          onClick={() => toggleReadMore(documentData.docid)}
          className="text-blue-600 text-xs mt-2 hover:underline"
        >
          {expandedDocs[documentData.docid] ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
