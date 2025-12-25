"use client";
import { useRef, useState, useEffect } from "react";
import TextTrainingModal from "@/app/admin/components/TextTrainingModal";
import DocumentViewModal from "@/app/admin/components/DocumentViewModal";
import DocumentCard from "@/app/admin/components/DocumentCard";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function Train() {
  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const brand = useBrandContext();

  const fetchDocuments = async () => {
    if (!brand?.subdomain) return;
    try {
      const res = await fetch(
        `/api/admin/training-documents?brand=${brand.subdomain}`
      );
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [brand?.subdomain]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  const processText = async (title, text) => {
    const brandName = brand?.subdomain || "";

    const gcsRes = await fetch("/api/admin/savetogcs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text, brand: brandName }),
    });
    if (!gcsRes.ok) throw new Error((await gcsRes.json()).error);
    const gcsData = await gcsRes.json();

    const embRes = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        brand: brandName,
        title,
        description: title,
        gcsPath: gcsData.gcsPath,
      }),
    });
    if (!embRes.ok) throw new Error((await embRes.json()).error);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const title = file.name.replace(/\.[^/.]+$/, "");
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

      await processText(title, text);
      alert("File uploaded successfully!");
      fileInputRef.current.value = "";
      fetchDocuments();
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
      await processText(data.title, data.content);
      alert("Text saved successfully!");
      setIsModalOpen(false);
      fetchDocuments();
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

  const handleEditDocument = async (doc) => {
    setOpenMenuId(null);
    const res = await fetch(
      `/api/admin/training-documents?brand=${brand?.subdomain}&docid=${doc.docid}`
    );
    const data = await res.json();
    if (res.ok && data.document) {
      setEditingDocument(data.document);
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
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert("Document updated successfully!");
      setIsEditModalOpen(false);
      setEditingDocument(null);
      fetchDocuments();
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
      fetchDocuments();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-900">Knowledge base</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Date</option>
              <option>Title</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-12">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full md:w-auto px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload Training Document"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-6 py-3 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            Text Based Training
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No documents uploaded yet
          </div>
        ) : (
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
              />
            ))}
          </div>
        )}

        <div className="text-center mt-12 text-sm text-blue-900">
          Powered by KAVISHA
        </div>
      </div>

      <TextTrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveText}
      />

      <TextTrainingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDocument(null);
        }}
        onSave={handleUpdateDocument}
        initialTitle={editingDocument?.title || ""}
        initialContent={editingDocument?.text || ""}
        isEditMode={true}
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
