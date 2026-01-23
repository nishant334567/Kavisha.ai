"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Trash2, FolderInput } from "lucide-react";
import TextTrainingModal from "@/app/admin/components/TextTrainingModal";
import DocumentViewModal from "@/app/admin/components/DocumentViewModal";
import DocumentCard from "@/app/admin/components/DocumentCard";
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
      alert(e?.message || "Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!confirm("Delete this folder? Documents in it will be moved to Unfiled."))
      return;
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
      alert(e?.message || "Failed to delete folder");
    }
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
    if (!embRes.ok) throw new Error((await embRes.json()).error);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setUploading(true);
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

      await processText(title, text, uploadFolderId || undefined, uploadSourceUrl || "");
      alert("File uploaded successfully!");
      fileInputRef.current.value = "";
      setSelectedFileName("");
      setUploadSourceUrl("");
      fetchDocuments(1, selectedFolderId);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveText = async (data) => {
    if (!data.title || !data.content) return;

    setUploading(true);
    try {
      // Truncate title to 50 characters (DB limit)
      const title =
        data.title.length > 50 ? data.title.substring(0, 50) : data.title;
      await processText(title, data.content, textUploadFolderId || undefined, data.sourceUrl || "");
      alert("Text saved successfully!");
      setIsModalOpen(false);
      fetchDocuments(1, selectedFolderId);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
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
        alert("Failed to load document");
        setIsViewModalOpen(false);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
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

      setSelectedDocs(new Set());
      setSelectionMode(false)
      setMoveTargetFolderId("")
      fetchDocuments(currentPage, selectedFolderId);
      alert(`Moved ${data.modifiedCount} document(s).`);
    } catch (err) {
      alert(err?.message || "Failed to move documents");
    } finally {
      setMoving(false);
    }
  }

  const handleEditDocument = async (doc) => {
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
      alert("Failed to load document");
    }
  };

  const handleUpdateDocument = async (updateData) => {
    if (!editingDocument) return;
    setUploading(true);
    try {
      const res = await fetch("/api/embeddings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docid: editingDocument.docid,
          text: updateData.content,
          brand: brand?.subdomain,
          title: updateData.title,
          folderId: (updateData.folderId ?? editFolderId) || null,
          ...(updateData.sourceUrl && { sourceUrl: updateData.sourceUrl }),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert("Document updated successfully!");
      setIsEditModalOpen(false);
      setEditingDocument(null);
      fetchDocuments(currentPage, selectedFolderId);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };


  const handleDeleteDocument = async (docid) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    setOpenMenuId(null);
    try {
      const res = await fetch(
        `/api/admin/training-documents?docid=${docid}&brand=${brand?.subdomain}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      alert("Document deleted successfully!");
      // If current page becomes empty, go to previous page, otherwise stay on current page
      if (documents.length === 1 && currentPage > 1) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        fetchDocuments(newPage, selectedFolderId);
      } else {
        fetchDocuments(currentPage, selectedFolderId);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="text-black hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="uppercase text-2xl font-bold text-blue-900 font-zen">
            Train your Avataar
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* PDF Document Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              PDF document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload and extract text from PDFs
            </p>
            <select
              value={uploadFolderId}
              onChange={(e) => setUploadFolderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
            >
              <option value="">Unfiled</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              type="url"
              value={uploadSourceUrl}
              onChange={(e) => setUploadSourceUrl(e.target.value)}
              placeholder="Source URL (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 placeholder:text-gray-400"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            <div className="mb-4 flex-1">
              <p className="text-xs text-gray-500">
                {selectedFileName || "No file chosen"}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-2 bg-[#EBF3FF] text-[#242473] rounded-lg hover:bg-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
            >
              {uploading ? "Uploading..." : "Choose file"}
            </button>
          </div>

          {/* YouTube Video Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Youtube video
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Transcribe and train from videos
            </p>
            <div className="mb-4 flex-1">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              />
            </div>
            <button
              disabled
              className="w-full px-4 py-2 bg-[#C0614E] text-white rounded-lg transition-colors text-sm font-medium opacity-50 cursor-not-allowed mt-auto"
            >
              Upload and transcribe
            </button>
          </div>

          {/* Direct Text Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Direct text
            </h3>
            <p className="text-sm text-gray-600 mb-4 flex-1">
              Type or paste directly
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full px-4 py-2 bg-[#DBFFD5] rounded-lg hover:bg-green-600 hover:text-white transition-colors text-sm font-medium mt-auto"
            >
              Add text
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center my-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#4D5495] font-akshar font-semibold uppercase">
              Knowledge base
            </p>
            {documents.length > 0 && (
              <button
                onClick={() => {
                  setSelectionMode((prev) => !prev);
                  if (selectionMode) setSelectedDocs(new Set());
                }}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              >
                {selectionMode ? "Cancel" : "Select"}
              </button>
            )}
            {selectionMode && selectedDocs.size > 0 && (
              <>
                <select
                  value={moveTargetFolderId}
                  onChange={(e) => setMoveTargetFolderId(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Unfiled</option>
                  {folders.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleMoveToFolder}
                  disabled={moving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#242473] text-white hover:bg-[#1a1a5c] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  Move to folder
                </button>
                <span className="text-sm text-gray-500">
                  {selectedDocs.size} selected
                </span>
              </>
            )}
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-gray-600">
              Showing {documents.length} of {totalCount} documents (Page{" "}
              {currentPage} of {totalPages})
            </span>
          )}
        </div>
        <div className="flex gap-6 mt-4">
          {/* Left: folders */}
          <div className="w-48 shrink-0 border-r border-gray-200 pr-4">
            <button
              onClick={handleAddFolder}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-100 text-gray-700 text-sm mb-2"
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
              className={`block w-full text-left px-2 py-1.5 rounded text-sm ${selectedFolderId === null ? "bg-[#EBF3FF] text-[#242473] font-medium" : "text-gray-700 hover:bg-gray-100"}`}
            >
              All
            </button>
            {folders.map((f) => (
              <div
                key={f._id}
                className={`flex items-center gap-1 rounded ${selectedFolderId === f._id ? "bg-[#EBF3FF]" : ""}`}
              >
                <button
                  onClick={() => {
                    setSelectedFolderId(f._id);
                    setCurrentPage(1);
                  }}
                  className={`flex-1 text-left px-2 py-1.5 rounded text-sm truncate ${selectedFolderId === f._id ? "text-[#242473] font-medium" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  {f.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(f._id);
                  }}
                  className="shrink-0 p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Right: documents */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
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
                      className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-12 text-sm text-blue-900">
          Powered by KAVISHA
        </div>
      </div>

      <TextTrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveText}
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
    </>
  );
}
