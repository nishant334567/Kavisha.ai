"use client";

import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useState, useEffect } from "react";
import ShowChunks from "./ShowChunks";
import { Trash2, Check, Loader2 } from "lucide-react";
export default function DocumentUploadCard({
  doc,
  toggleReadMore,
  expandedDocs,
  onDelete,
}) {
  const [editedDoctext, setEditedDoctext] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  //   const [chunkSize, setChunksize] = useState();
  const [saving, setSaving] = useState(false);
  const [documentData, setDocumentData] = useState({});
  const [showAllChunks, setShowAllChunks] = useState(false);

  const brandContext = useBrandContext();

  useEffect(() => {
    if (doc) setDocumentData(doc);
  }, [doc]);

  const toggleShowAllChunks = () => {
    setShowAllChunks((prev) => !prev);
  };
  const handleEditDoc = (id) => {
    setEditedDoctext(documentData?.text || "");
    // setChunksize(documentData?.chunkSize || 200);
    setIsEditing(true);
  };

  const refetchDocument = async (docid) => {
    try {
      const response = await fetch(
        `/api/admin/training-documents?docid=${docid}&brand=${brandContext?.subdomain}`
      );
      const data = await response.json();
      if (data.document) setDocumentData(data.document);
    } catch (err) {}
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
          //   chunkSize: chunkSize || documentData?.chunkSize || 200,
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
      alert(err.message || "Failed to update the document");
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  };

  return (
    <>
      <ShowChunks
        docid={documentData.docid}
        isOpen={showAllChunks}
        onClose={toggleShowAllChunks}
      />
      <div
        key={documentData._id}
        className="rounded-xl border border-border bg-card p-5 text-foreground shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            {documentData.title && (
              <div className="mb-1">
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
                  📄 {documentData.title}
                </span>
              </div>
            )}

            <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="font-mono text-highlight">
                ID: {documentData.docid}
              </span>
              <span>
                Created{" "}
                {new Date(documentData.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {documentData.updatedAt && (
                <span>
                  • Updated{" "}
                  {new Date(documentData.updatedAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <button
              onClick={toggleShowAllChunks}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-highlight hover:bg-muted-bg"
            >
              Show all chunks
            </button>

            {isEditing ? (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {/* <select
              value={chunkSize || documentData?.chunkSize || 200}
              onChange={(e) => setChunksize(parseInt(e.target.value))}
              className="rounded-md border border-border bg-input px-3 py-1.5 text-xs text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              {[150, 200, 250, 300, 350, 400, 450, 500, 550, 600].map(
                (size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                )
              )}
            </select> */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDoc}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-md bg-highlight px-4 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Save changes"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedDoctext(documentData.text);
                      //   setChunksize(documentData?.chunkSize);
                    }}
                    disabled={saving}
                    className="rounded-md bg-muted-bg px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                    title="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => onDelete && onDelete(doc)}
                  className="group rounded-md p-1.5 transition-colors hover:bg-muted-bg"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4 opacity-70 group-hover:opacity-100 text-red-600" />
                </button>
                <button
                  onClick={() => handleEditDoc(documentData._id)}
                  className="rounded-md bg-muted-bg px-3 py-1.5 text-xs font-medium text-highlight transition-colors hover:bg-background"
                  title="Edit document"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-3 max-h-[260px] overflow-y-auto border-t border-border pt-3">
          {isEditing ? (
            <textarea
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
              value={editedDoctext}
              rows={4}
              onChange={(e) => setEditedDoctext(e.target.value)}
            />
          ) : (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
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
            className="mt-2 text-xs text-highlight hover:underline"
          >
            {expandedDocs[documentData.docid] ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </>
  );
}
