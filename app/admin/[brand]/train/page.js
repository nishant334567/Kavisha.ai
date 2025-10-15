"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
const fetchEmbeddings = async (brand, page = 1) => {
  const res = await fetch(
    `/api/admin/fetch-chunks/?brand=${brand}&page=${page}`
  );
  const data = await res.json();
  return data;
};
export default function TrainPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const brandContext = useBrandContext();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [embeddings, setEmbeddings] = useState([]);
  const [currentPage, setCurrentpage] = useState(0);
  const [totalPage, setTotalPage] = useState(0);
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    chunkId: null,
    chunkText: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState({});

  useEffect(() => {
    // Check if user is not logged in
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check if session is still loading
    if (status === "loading") {
      return;
    }

    // Check if user is logged in but not an admin
    if (session && brandContext && brandContext.admins) {
      if (!brandContext.admins.includes(session.user?.email)) {
        alert(
          "You don't have admin privileges to access this. Ask admins for access"
        );
        router.push("/login");
        return;
      }
    }

    if (!brandContext || !brandContext?.subdomain) return;

    const loadEmbeddings = async () => {
      setEmbeddingsLoading(true);
      try {
        const batchChunks = await fetchEmbeddings(brandContext?.subdomain, 1);
        setEmbeddings(batchChunks.chunks || []);
        setTotalPage(batchChunks.totalPages || 0);
        setCurrentpage(1);
      } catch (error) {
        console.error("Error loading embeddings:", error);
        setEmbeddings([]);
      } finally {
        setEmbeddingsLoading(false);
      }
    };

    loadEmbeddings();
  }, [session, status, brandContext, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (
    status === "unauthenticated" ||
    !session ||
    !brandContext?.admins ||
    !brandContext.admins.includes(session.user?.email)
  ) {
    return null;
  }

  const nextEmbeddings = async () => {
    if (currentPage === totalPage || embeddingsLoading) return;
    setEmbeddingsLoading(true);
    try {
      const data = await fetchEmbeddings(
        brandContext?.subdomain,
        currentPage + 1
      );
      setEmbeddings(data.chunks || []);
      setCurrentpage((prev) => prev + 1);
      setExpandedChunks({});
    } catch (error) {
      console.error("Error loading next page:", error);
    } finally {
      setEmbeddingsLoading(false);
    }
  };

  const previousEmbeddings = async () => {
    if (currentPage <= 1 || embeddingsLoading) return;
    setEmbeddingsLoading(true);
    try {
      const data = await fetchEmbeddings(
        brandContext?.subdomain,
        currentPage - 1
      );
      setEmbeddings(data.chunks || []);
      setCurrentpage((prev) => prev - 1);
      setExpandedChunks({});
    } catch (error) {
      console.error("Error loading previous page:", error);
    } finally {
      setEmbeddingsLoading(false);
    }
  };

  const handleDeleteClick = (chunk) => {
    setDeleteModal({
      show: true,
      chunkId: chunk.chunkId,
      chunkText: chunk.text?.slice(0, 100) + "...",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.chunkId) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/delete-chunk?chunkId=${deleteModal.chunkId}&brand=${brandContext.subdomain}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete chunk");
      }

      setSuccess("Chunk deleted successfully");
      setDeleteModal({ show: false, chunkId: null, chunkText: "" });

      // Refresh the current page
      const refreshedData = await fetchEmbeddings(
        brandContext?.subdomain,
        currentPage
      );
      setEmbeddings(refreshedData.chunks || []);
      setTotalPage(refreshedData.totalPages || 0);

      // If current page is now empty and it's not page 1, go to previous page
      if (
        refreshedData.chunks.length === 0 &&
        currentPage > 1 &&
        currentPage > refreshedData.totalPages
      ) {
        setCurrentpage((prev) => prev - 1);
        const prevPageData = await fetchEmbeddings(
          brandContext?.subdomain,
          currentPage - 1
        );
        setEmbeddings(prevPageData.chunks || []);
      }
    } catch (err) {
      setError(err.message);
      setDeleteModal({ show: false, chunkId: null, chunkText: "" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, chunkId: null, chunkText: "" });
  };

  const toggleReadMore = (chunkId) => {
    setExpandedChunks((prev) => ({
      ...prev,
      [chunkId]: !prev[chunkId],
    }));
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file");
      return;
    }

    setPdfLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch("/api/new-extract-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract text from PDF");
      }

      setText(data.text);
      setSuccess(`Successfully extracted text from PDF: ${file.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          brand: brandContext.subdomain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate embedding");
      }

      setSuccess(`Your AI avatar is getting smarter!`);
      setText("");

      // Refresh embeddings list to show the newly added embedding
      if (currentPage === 1) {
        const refreshedData = await fetchEmbeddings(brandContext?.subdomain, 1);
        setEmbeddings(refreshedData.chunks || []);
        setTotalPage(refreshedData.totalPages || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Train Your AI Avatar</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload PDF to train your avatar:
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  disabled={pdfLoading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {pdfLoading && (
                  <span className="text-sm text-blue-600">
                    Extracting text...
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Teach your AI about your business:
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Teach your AI assistant about your business, products, and expertise..."
                className="w-full h-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !text.trim() || pdfLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Training Avatar..." : "Train My Avatar"}
            </button>
          </form>

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-600 text-sm">✓ {success}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">✗ {error}</p>
            </div>
          )}
        </div>

        {/* Knowledge Base Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your AI's Knowledge</h2>
            {totalPage > 0 && (
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPage}
              </span>
            )}
          </div>

          {embeddingsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : embeddings && embeddings.length > 0 ? (
            <div className="space-y-4">
              {embeddings.map((chunk, index) => (
                <div
                  key={chunk._id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          ID: {chunk.chunkId}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(chunk.createdAt).toLocaleDateString(
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
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(chunk)}
                      className="ml-2 p-2 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete chunk"
                    >
                      <img
                        src="/delete_2.png"
                        alt="Delete"
                        className="w-5 h-5"
                      />
                    </button>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {chunk?.text?.length > 400 && !expandedChunks[chunk.chunkId]
                      ? `${chunk.text.slice(0, 400)}...`
                      : chunk.text}
                  </p>
                  {chunk?.text?.length > 400 && (
                    <button
                      onClick={() => toggleReadMore(chunk.chunkId)}
                      className="text-blue-600 text-xs mt-2 hover:underline"
                    >
                      {expandedChunks[chunk.chunkId]
                        ? "Show less"
                        : "Show more"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No knowledge added yet</p>
              <p className="text-sm mt-2">
                Upload a PDF or enter text above to start training your AI
                avatar
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPage > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 pt-6 border-t">
              <button
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currentPage <= 1 || embeddingsLoading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={previousEmbeddings}
                disabled={currentPage <= 1 || embeddingsLoading}
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600 font-medium">
                {currentPage} / {totalPage}
              </span>
              <button
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currentPage === totalPage || embeddingsLoading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={nextEmbeddings}
                disabled={currentPage === totalPage || embeddingsLoading}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this chunk?
            </p>
            <div className="bg-gray-50 p-3 rounded mb-4">
              <p className="text-sm text-gray-700 italic">
                "{deleteModal.chunkText}"
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ID: {deleteModal.chunkId}
              </p>
            </div>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone. The knowledge will be removed from
              your AI's training.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
