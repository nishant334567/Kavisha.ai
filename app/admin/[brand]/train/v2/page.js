"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

    setSelectedFileName(file.name);
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
      setSelectedFileName("");
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
        <p className="text-[#4D5495] my-4 font-akshar font-semibold uppercase">
          Knowledge base
        </p>
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
