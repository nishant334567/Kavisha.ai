"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FolderPlus,
  Trash2,
  FolderInput,
  Loader2,
  CheckCircle2,
  X,
  CheckSquare,
} from "lucide-react";
import TextTrainingModal from "@/app/admin/components/TextTrainingModal";
import DocumentViewModal from "@/app/admin/components/DocumentViewModal";
import DocumentCard from "@/app/admin/components/DocumentCard";
import TrainSourcesPanel from "@/app/admin/components/TrainSourcesPanel";
import WebsiteImportProvider from "@/app/admin/components/WebsiteImportWizard";
import ConfirmModal from "@/app/components/ConfirmModal";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function Train() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const brand = useBrandContext();
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadSourceUrl, setUploadSourceUrl] = useState("");
  const [textUploadFolderId, setTextUploadFolderId] = useState("");
  const [editFolderId, setEditFolderId] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTraining, setActiveTraining] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const isTraining = Boolean(activeTraining);

  const showNotice = useCallback((title, message, variant = "success") => {
    setNoticeDialog({ title, message, variant });
  }, []);
  /** Virtual "All" view — not a deletable folder; block mass delete here. */
  const viewingAllDocuments = selectedFolderId == null;

  const getResponsePayload = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const getResponseError = (payload, fallback) =>
    payload?.error || payload?.message || fallback;

  const fetchFolders = async () => {
    if (!brand?.subdomain) return;
    try {
      const res = await fetch(
        `/api/admin/knowledge-folders?brand=${brand.subdomain}`
      );
      const data = await res.json();
      if (res.ok) setFolders(data.folders || []);
    } catch (e) {
      console.error("Failed to fetch folders:", e);
    }
  };

  const fetchDocuments = async (page = 1, folderId = undefined) => {
    if (!brand?.subdomain) return;
    try {
      setLoading(true);
      let url = `/api/admin/training-documents?brand=${brand.subdomain}&page=${page}`;
      if (folderId) url += `&folderId=${folderId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async () => {
    const name = prompt("Folder name");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/admin/knowledge-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand?.subdomain, name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchFolders();
    } catch (e) {
      showNotice("Couldn't create folder", e?.message || "Failed to create folder", "error");
    }
  };

  const handleDeleteFolder = (folderId) => {
    const folder = folders.find((f) => String(f._id) === String(folderId));
    setConfirmDialog({
      title: "Delete folder?",
      message: folder
        ? `“${folder.name}” will be removed. Documents inside will move to Unfiled.`
        : "This folder will be removed. Documents inside will move to Unfiled.",
      confirmLabel: "Delete folder",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/admin/knowledge-folders?brand=${brand?.subdomain}&folderId=${folderId}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error((await res.json()).error);
          fetchFolders();
          if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
            setCurrentPage(1);
          }
          if (uploadFolderId === folderId) setUploadFolderId("");
          if (textUploadFolderId === folderId) setTextUploadFolderId("");
        } catch (e) {
          showNotice("Couldn't delete folder", e?.message || "Failed to delete folder", "error");
        }
      },
    });
  };

  useEffect(() => {
    fetchFolders();
  }, [brand?.subdomain]);

  useEffect(() => {
    fetchDocuments(currentPage, selectedFolderId);
  }, [brand?.subdomain, currentPage, selectedFolderId]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  const processText = async (title, text, folderId, sourceUrl = "") => {
    const brandName = brand?.subdomain || "";

    const embRes = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        brand: brandName,
        title,
        description: title,
        ...(folderId && { folderId }),
        ...(sourceUrl && { sourceUrl }),
      }),
    });
    const payload = await getResponsePayload(embRes);
    if (!embRes.ok) {
      throw new Error(getResponseError(payload, "Training failed"));
    }

    return payload;
  };

  const handleWebsiteImportComplete = (result) => {
    setTrainingResult(result);
    setCurrentPage(1);
    fetchDocuments(1, selectedFolderId);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || isTraining) return;

    setSelectedFileName(file.name);
    setUploading(true);
    setActiveTraining({
      type: "upload",
      title: file.name.replace(/\.[^/.]+$/, ""),
    });
    try {
      // Extract title from filename and truncate to 50 characters (DB limit)
      const fullTitle = file.name.replace(/\.[^/.]+$/, "");
      const title =
        fullTitle.length > 50 ? fullTitle.substring(0, 50) : fullTitle;
      let text = "";

      if (file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("pdf", file);
        const res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.text)
          throw new Error(data.error || "Failed to extract PDF");
        text = data.text;
      } else if (file.type.startsWith("text/")) {
        text = await file.text();
      } else {
        throw new Error("Only PDF and text files allowed");
      }

      const data = await processText(
        title,
        text,
        uploadFolderId || undefined,
        uploadSourceUrl || ""
      );

      setTrainingResult({
        title,
        docid: data.docid,
        chunkCount: data.chunkIds?.length || 0,
        message: data.message || "Training completed successfully",
      });

      fileInputRef.current.value = "";
      setSelectedFileName("");
      setUploadSourceUrl("");
      fetchDocuments(1, selectedFolderId);
    } catch (error) {
      showNotice("Upload failed", error.message, "error");
    } finally {
      setUploading(false);
      setActiveTraining(null);
    }
  };

  const handleSaveText = async (data) => {
    if (!data.title || !data.content || isTraining) return;

    const title =
      data.title.length > 50 ? data.title.substring(0, 50) : data.title;

    setUploading(true);
    setIsModalOpen(false);
    setActiveTraining({ type: "text", title });
    try {
      const result = await processText(
        title,
        data.content,
        textUploadFolderId || undefined,
        data.sourceUrl || ""
      );

      setTrainingResult({
        title,
        docid: result.docid,
        chunkCount: result.chunkIds?.length || 0,
        message: result.message || "Training completed successfully",
      });
      fetchDocuments(1, selectedFolderId);
    } catch (error) {
      showNotice("Couldn't save text", error.message, "error");
    } finally {
      setUploading(false);
      setActiveTraining(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  const handleViewDocument = async (docid) => {
    setOpenMenuId(null);
    setLoadingDocumentId(docid);
    setIsViewModalOpen(true);
    try {
      const res = await fetch(
        `/api/admin/training-documents?brand=${brand?.subdomain}&docid=${docid}`
      );
      const data = await res.json();
      if (res.ok && data.document) {
        setSelectedDocument(data.document);
      } else {
        showNotice("Couldn't open document", "Failed to load document.", "error");
        setIsViewModalOpen(false);
      }
    } catch (error) {
      showNotice("Couldn't open document", error.message, "error");
      setIsViewModalOpen(false);
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const toggleSelect = (docid) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docid)) next.delete(docid);
      else next.add(docid);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedDocs(new Set(documents.map((d) => d.docid)));
  };

  const clearSelection = () => {
    setSelectedDocs(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedDocs(new Set());
    setMoveTargetFolderId("");
  };

  const allOnPageSelected =
    documents.length > 0 && selectedDocs.size === documents.length;

  const handleMoveToFolder = async () => {
    const docids = [...selectedDocs];
    if (docids.length === 0) return;
    setMoving(true);

    try {
      const res = await fetch("/api/admin/training-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docids,
          folderId: moveTargetFolderId || null,
          brand: brand?.subdomain
        })
      })

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move");

      exitSelectionMode();
      fetchDocuments(currentPage, selectedFolderId);
      showNotice(
        "Documents moved",
        `Moved ${data.modifiedCount} document${data.modifiedCount === 1 ? "" : "s"}.`,
        "success"
      );
    } catch (err) {
      showNotice("Couldn't move documents", err?.message || "Failed to move documents", "error");
    } finally {
      setMoving(false);
    }
  }

  const handleEditDocument = async (doc) => {
    if (isTraining) return;
    setOpenMenuId(null);
    const res = await fetch(
      `/api/admin/training-documents?brand=${brand?.subdomain}&docid=${doc.docid}`
    );
    const data = await res.json();
    if (res.ok && data.document) {
      setEditingDocument(data.document);
      setEditFolderId(data.document.folderId ? String(data.document.folderId) : "");
      setIsEditModalOpen(true);
    } else {
      showNotice("Couldn't open document", "Failed to load document.", "error");
    }
  };

  const handleUpdateDocument = async (updateData) => {
    if (!editingDocument || isTraining) return;

    const currentDocument = editingDocument;
    const trainingTitle = updateData.title || currentDocument.title;

    setUploading(true);
    setIsEditModalOpen(false);
    setEditingDocument(null);
    setActiveTraining({
      type: "edit",
      title: trainingTitle,
    });
    try {
      const res = await fetch("/api/embeddings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docid: currentDocument.docid,
          text: updateData.content,
          brand: brand?.subdomain,
          title: updateData.title,
          folderId: (updateData.folderId ?? editFolderId) || null,
          ...(updateData.sourceUrl && { sourceUrl: updateData.sourceUrl }),
        }),
      });
      const payload = await getResponsePayload(res);
      if (!res.ok) {
        throw new Error(getResponseError(payload, "Document update failed"));
      }

      setTrainingResult({
        title: trainingTitle,
        docid: payload.docid || currentDocument.docid,
        chunkCount: payload.chunkIds?.length || 0,
        message: payload.message || "Document updated successfully",
      });
      fetchDocuments(currentPage, selectedFolderId);
    } catch (error) {
      showNotice("Couldn't update document", error.message, "error");
    } finally {
      setUploading(false);
      setActiveTraining(null);
    }
  };


  const refreshAfterDelete = (deletedCount) => {
    const remainingOnPage = documents.length - deletedCount;
    if (remainingOnPage <= 0 && currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchDocuments(newPage, selectedFolderId);
    } else {
      fetchDocuments(currentPage, selectedFolderId);
    }
  };

  const handleDeleteDocument = (docid) => {
    setOpenMenuId(null);
    const doc = documents.find((d) => d.docid === docid);
    setConfirmDialog({
      title: "Delete document?",
      message: doc
        ? `“${doc.title}” will be permanently removed from your knowledge base. This cannot be undone.`
        : "This document will be permanently removed from your knowledge base. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/admin/training-documents?docid=${docid}&brand=${brand?.subdomain}`,
            { method: "DELETE" }
          );
          if (!res.ok) throw new Error((await res.json()).error);
          showNotice(
            "Document deleted",
            "The document was removed from your knowledge base.",
            "success"
          );
          refreshAfterDelete(1);
        } catch (error) {
          showNotice("Couldn't delete document", error.message, "error");
        }
      },
    });
  };

  const handleDeleteSelected = () => {
    if (viewingAllDocuments) {
      showNotice(
        "Choose a folder",
        "Bulk delete is disabled while viewing All. Open a specific folder to delete documents.",
        "error"
      );
      return;
    }
    const docids = [...selectedDocs];
    if (docids.length === 0) return;
    const count = docids.length;
    setConfirmDialog({
      title: count === 1 ? "Delete document?" : `Delete ${count} documents?`,
      message:
        count === 1
          ? "This document will be permanently removed from your knowledge base. This cannot be undone."
          : `${count} documents will be permanently removed from your knowledge base. This cannot be undone.`,
      confirmLabel: count === 1 ? "Delete" : `Delete ${count}`,
      variant: "danger",
      onConfirm: async () => {
        setDeleting(true);
        try {
          const res = await fetch("/api/admin/training-documents", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brand: brand?.subdomain,
              docids,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to delete");

          const deleted = data.deletedCount ?? docids.length;
          exitSelectionMode();
          showNotice(
            deleted === 1 ? "Document deleted" : "Documents deleted",
            data.message ||
              `${deleted} document${deleted === 1 ? "" : "s"} removed from your knowledge base.`,
            "success"
          );
          refreshAfterDelete(deleted);
        } catch (error) {
          showNotice("Couldn't delete documents", error.message, "error");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <>
      <div className="mx-auto max-w-7xl bg-background px-4 py-8 text-foreground">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-foreground transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-baloo text-2xl font-bold uppercase text-highlight">
            Train your Avataar
          </h1>
        </div>

        {isTraining && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted-bg px-4 py-3 text-sm text-muted">
            <Loader2 className="mt-0.5 h-4 w-4 animate-spin shrink-0" />
            <div>
              <p className="font-semibold text-highlight">Training in progress</p>
              <p>
                {activeTraining?.type === "website"
                  ? "Importing from website and training your knowledge base. This may take several minutes."
                  : activeTraining?.type === "website-scrape"
                    ? `Scraping ${activeTraining?.title || "website pages"} on the server. You can minimize the dialog and keep working.`
                    : `${activeTraining?.title || "Document"} is being trained. New training is disabled until this completes.`}
              </p>
            </div>
          </div>
        )}

        <WebsiteImportProvider
          brandSubdomain={brand?.subdomain}
          folders={folders}
          disabled={isTraining}
          onTrainingChange={setActiveTraining}
          onComplete={handleWebsiteImportComplete}
          onDocumentsRefresh={() => {
            fetchFolders();
            fetchDocuments(1, selectedFolderId);
          }}
        >
          <TrainSourcesPanel
            fileInputRef={fileInputRef}
            folders={folders}
            isTraining={isTraining}
            uploading={uploading}
            uploadFolderId={uploadFolderId}
            onUploadFolderChange={setUploadFolderId}
            uploadSourceUrl={uploadSourceUrl}
            onUploadSourceUrlChange={setUploadSourceUrl}
            selectedFileName={selectedFileName}
            onFileChange={handleFileChange}
            onChooseFile={() => fileInputRef.current?.click()}
            onOpenTextModal={() => setIsModalOpen(true)}
          />
        </WebsiteImportProvider>
        <div className="my-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="font-baloo font-semibold uppercase text-highlight">
              Knowledge base
            </p>
            {documents.length > 0 && !selectionMode && (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted-bg"
              >
                <CheckSquare className="h-4 w-4 text-muted" />
                Select
              </button>
            )}
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-muted">
              {selectionMode && selectedDocs.size > 0
                ? `${selectedDocs.size} of ${documents.length} on this page`
                : null}
              {selectionMode && selectedDocs.size > 0 ? " · " : null}
              Showing {documents.length} of {totalCount}
              {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
            </span>
          )}
        </div>

        {selectionMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/25 bg-highlight/5 px-4 py-3">
            <p className="text-sm text-foreground">
              <span className="font-medium text-highlight">Selection mode</span>
              <span className="text-muted"> — click cards to select</span>
              {viewingAllDocuments && (
                <span className="text-muted">
                  {" "}
                  (bulk delete disabled in All)
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={
                  allOnPageSelected ? clearSelection : selectAllOnPage
                }
                disabled={documents.length === 0}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-highlight hover:bg-highlight/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allOnPageSelected ? "Deselect all" : "Select all"}
              </button>
              {selectedDocs.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-muted-bg hover:text-foreground"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={exitSelectionMode}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted-bg"
              >
                Done
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-6 mt-4">
          {/* Left: folders */}
          <div className="w-48 shrink-0 border-r border-border pr-4">
            <button
              onClick={handleAddFolder}
              className="mb-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-muted-bg"
              title="Add folder"
            >
              <FolderPlus className="w-4 h-4" />
              Add folder
            </button>
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setCurrentPage(1);
              }}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${selectedFolderId === null ? "bg-muted-bg font-medium text-highlight" : "text-foreground hover:bg-muted-bg"}`}
            >
              All
            </button>
            {folders.map((f) => (
              <div
                key={f._id}
                className={`flex items-center gap-1 rounded ${selectedFolderId === f._id ? "bg-muted-bg" : ""}`}
              >
                <button
                  onClick={() => {
                    setSelectedFolderId(f._id);
                    setCurrentPage(1);
                  }}
                  className={`flex-1 truncate rounded px-2 py-1.5 text-left text-sm ${selectedFolderId === f._id ? "font-medium text-highlight" : "text-foreground hover:bg-muted-bg"}`}
                >
                  {f.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(f._id);
                  }}
                  className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-muted-bg hover:text-red-600"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Right: documents */}
          <div
            className={`flex-1 min-w-0 ${selectionMode && selectedDocs.size > 0 ? "pb-24" : ""}`}
          >
            {loading ? (
              <div className="py-8 text-center text-muted">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-muted">
                {selectedFolderId
                  ? "No documents in this folder"
                  : "No documents uploaded yet"}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc._id}
                      doc={doc}
                      onView={handleViewDocument}
                      onEdit={handleEditDocument}
                      onDelete={handleDeleteDocument}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      loadingDocumentId={loadingDocumentId}
                      formatDate={formatDate}
                      selectionMode={selectionMode}
                      isSelected={selectedDocs.has(doc.docid)}
                      onToggleSelect={() => toggleSelect(doc.docid)}
                      folderName={folders.find((f) => String(f._id) === String(doc.folderId))?.name ?? null}
                      trainingLocked={isTraining}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="rounded-lg border border-border bg-card px-6 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-border bg-card px-6 py-2 text-sm font-medium text-foreground hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted">
          Powered by KAVISHA
        </div>
      </div>

      {selectionMode && selectedDocs.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 inline-flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-card py-2.5 pl-3.5 pr-3 shadow-[0_4px_14px_rgba(0,0,0,0.12),0_20px_48px_-6px_rgba(0,0,0,0.28)]">
          <span className="shrink-0 pl-0.5 text-sm font-medium tabular-nums text-muted">
            <span className="font-semibold text-foreground">{selectedDocs.size}</span>{" "}
            selected
          </span>
          <div className="h-5 w-px shrink-0 bg-border/70" aria-hidden />
          <select
            value={moveTargetFolderId}
            onChange={(e) => setMoveTargetFolderId(e.target.value)}
            className="max-w-[8.5rem] shrink-0 rounded-full border border-border/70 bg-muted-bg/80 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-highlight/20"
            aria-label="Destination folder"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMoveToFolder}
            disabled={moving || deleting}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-highlight px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-highlight/25 transition-[opacity,transform] hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderInput className="h-4 w-4" />
            {moving ? "Moving…" : "Move"}
          </button>
          {!viewingAllDocuments && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting || moving}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-200/90 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 shadow-sm transition-[background-color,transform] hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      )}

      <TextTrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveText}
        isSaving={isTraining}
        folders={folders}
        folderId={textUploadFolderId}
        onFolderChange={setTextUploadFolderId}
      />

      <TextTrainingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDocument(null);
          setEditFolderId("");
        }}
        onSave={handleUpdateDocument}
        initialTitle={editingDocument?.title || ""}
        initialContent={editingDocument?.text || ""}
        initialSourceUrl={editingDocument?.sourceUrl || ""}
        isEditMode={true}
        isSaving={isTraining}
        folders={folders}
        folderId={editFolderId}
        onFolderChange={setEditFolderId}
      />

      <DocumentViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        variant={confirmDialog?.variant}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          await action?.();
        }}
      />

      <ConfirmModal
        isOpen={Boolean(noticeDialog)}
        alertOnly
        title={noticeDialog?.title}
        message={noticeDialog?.message ?? ""}
        confirmLabel="OK"
        variant={noticeDialog?.variant ?? "success"}
        onCancel={() => setNoticeDialog(null)}
        onConfirm={() => setNoticeDialog(null)}
      />

      {trainingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <h2 className="text-lg font-semibold text-highlight">
                    Training Completed
                  </h2>
                  <p className="text-sm text-muted">
                    {trainingResult.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTrainingResult(null)}
                className="rounded-full p-1 text-muted hover:bg-muted-bg hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted-bg p-4 text-sm">
              <div>
                <p className="text-muted">Document</p>
                <p className="break-words font-medium text-foreground">
                  {trainingResult.title}
                </p>
              </div>
              <div>
                <p className="text-muted">Doc ID</p>
                <p className="break-all font-mono text-xs text-foreground">
                  {trainingResult.docid}
                </p>
              </div>
              <div>
                <p className="text-muted">Chunks trained</p>
                <p className="font-medium text-foreground">
                  {trainingResult.chunkCount}
                </p>
              </div>
              {trainingResult.scrapedCount != null && (
                <div>
                  <p className="text-muted">Pages imported</p>
                  <p className="font-medium text-foreground">
                    {trainingResult.scrapedCount}
                    {trainingResult.substantiveCount != null &&
                      ` (${trainingResult.substantiveCount} with main content)`}
                  </p>
                </div>
              )}
              {Array.isArray(trainingResult.failed) &&
                trainingResult.failed.length > 0 && (
                  <div>
                    <p className="text-muted">Failed pages</p>
                    <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-foreground">
                      {trainingResult.failed.map((f, i) => (
                        <li key={f.url || f.sourceUrl || i} className="break-words">
                          <span className="font-medium">
                            {f.sourceUrl || f.url || "Page"}
                          </span>
                          {f.error ? (
                            <span className="text-red-600"> — {f.error}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setTrainingResult(null)}
                className="rounded-xl bg-highlight px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
