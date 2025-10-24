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
  // Training states
  const [trainingData, setTrainingData] = useState({
    text: "",
    youtubeUrl: "",
    pdfFile: null
  });
  const [loading, setLoading] = useState({
    text: false,
    youtube: false,
    pdf: false
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Knowledge base states
  const [embeddings, setEmbeddings] = useState([]);
  const [currentPage, setCurrentpage] = useState(0);
  const [totalPage, setTotalPage] = useState(0);
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState({});
  
  // Modals and jobs
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    chunkId: null,
    chunkText: "",
  });
  const [deleting, setDeleting] = useState(false);
  const [transcriptionJobs, setTranscriptionJobs] = useState([]);
  const [checkingStatus, setCheckingStatus] = useState({});
  const [transcriptionModal, setTranscriptionModal] = useState({
    show: false,
    transcription: "",
    jobId: null,
    url: ""
  });

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

  // Unified training function
  const trainWithData = async (type, data) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setError(null);
    setSuccess(null);

    try {
      let response;
      
      if (type === 'text') {
        response = await fetch("/api/embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: data.trim(),
            brand: brandContext.subdomain,
          }),
        });
      } else if (type === 'pdf') {
      const formData = new FormData();
        formData.append("pdf", data);
        response = await fetch("/api/new-extract-pdf", {
        method: "POST",
        body: formData,
      });
      } else if (type === 'youtube') {
        response = await fetch(`https://api.kavisha.ai/save-audio?url=${encodeURIComponent(data)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to process ${type}`);
      }

      if (type === 'youtube' && result.success) {
        setSuccess("YouTube video uploaded! Transcription job started.");
        setTranscriptionJobs(prev => [{
          id: result.jobId,
          url: data,
          status: "processing",
          file: result.file,
          createdAt: new Date().toISOString()
        }, ...prev]);
        setTrainingData(prev => ({ ...prev, youtubeUrl: "" }));
      } else if (type === 'pdf') {
        setSuccess(`PDF processed: ${data.name}`);
        setTrainingData(prev => ({ ...prev, text: result.text }));
      } else if (type === 'text') {
        setSuccess("Text added to knowledge base!");
        setTrainingData(prev => ({ ...prev, text: "" }));
        refreshEmbeddings();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const refreshEmbeddings = async () => {
    if (currentPage === 1) {
      const refreshedData = await fetchEmbeddings(brandContext?.subdomain, 1);
      setEmbeddings(refreshedData.chunks || []);
      setTotalPage(refreshedData.totalPages || 0);
    }
  };

  const checkTranscriptionStatus = async (jobId) => {
    setCheckingStatus(prev => ({ ...prev, [jobId]: true }));
    
    try {
      const response = await fetch(`https://api.kavisha.ai/status?jobid=${jobId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Status check response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Status check response data:', data);

      if (data.status === "done" && data.transcription) {
        // Update job status
        setTranscriptionJobs(prev => 
          prev.map(job => 
            job.id === jobId 
              ? { ...job, status: "completed", transcription: data.transcription }
              : job
          )
        );
        
        // Show transcription modal instead of auto-processing
        const job = transcriptionJobs.find(job => job.id === jobId);
        setTranscriptionModal({
          show: true,
          transcription: data.transcription,
          jobId: jobId,
          url: job?.url || ""
        });
      } else if (data.status === "error") {
        setTranscriptionJobs(prev => 
          prev.map(job => 
            job.id === jobId 
              ? { ...job, status: "error", error: data.error }
              : job
          )
        );
        setError(`Transcription failed: ${data.error}`);
      } else {
        // Still processing, update status
        setTranscriptionJobs(prev => 
          prev.map(job => 
            job.id === jobId 
              ? { ...job, status: "processing" }
              : job
          )
        );
      }
    } catch (err) {
      console.error('Status check error:', err);
      setError(`Failed to check status: ${err.message}`);
    } finally {
      setCheckingStatus(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleTrainFromModal = async () => {
    if (!transcriptionModal.transcription.trim()) return;

    setLoading(prev => ({ ...prev, text: true }));
    setError(null);
    setSuccess(null);

    try {
      await trainWithData('text', transcriptionModal.transcription);
      setTranscriptionModal({ show: false, transcription: "", jobId: null, url: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, text: false }));
    }
  };

  const handleCloseTranscriptionModal = () => {
    setTranscriptionModal({ show: false, transcription: "", jobId: null, url: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Train Your AI Avatar</h1>
          <p className="text-gray-600">Choose how you want to add knowledge to your AI</p>
        </div>

        {/* Training Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* PDF Training Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">PDF Document</h3>
              <p className="text-sm text-gray-600 mt-1">Upload and extract text from PDFs</p>
            </div>
            <div className="space-y-3">
                <input
                  type="file"
                  accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.type === "application/pdf") {
                    setTrainingData(prev => ({ ...prev, pdfFile: file }));
                    trainWithData('pdf', file);
                  } else if (file) {
                    setError("Please select a PDF file");
                  }
                }}
                disabled={loading.pdf}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {loading.pdf && (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-blue-600">Processing PDF...</span>
                </div>
              )}
            </div>
          </div>

          {/* YouTube Training Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">YouTube Video</h3>
              <p className="text-sm text-gray-600 mt-1">Transcribe and train from videos</p>
            </div>
            <div className="space-y-3">
              <input
                type="url"
                value={trainingData.youtubeUrl}
                onChange={(e) => setTrainingData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
              <button
                onClick={() => trainWithData('youtube', trainingData.youtubeUrl)}
                disabled={loading.youtube || !trainingData.youtubeUrl.trim()}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading.youtube ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "Upload & Transcribe"
                )}
              </button>
            </div>
          </div>

          {/* Text Training Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Direct Text</h3>
              <p className="text-sm text-gray-600 mt-1">Type or paste text directly</p>
            </div>
            <div className="space-y-3">
              <textarea
                value={trainingData.text}
                onChange={(e) => setTrainingData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter your knowledge here..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
              />
            <button
                onClick={() => trainWithData('text', trainingData.text)}
                disabled={loading.text || !trainingData.text.trim()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading.text ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Training...
                  </>
                ) : (
                  "Add to Knowledge"
                )}
            </button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
            </div>
          )}

          {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Transcription Jobs Section */}
        {transcriptionJobs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-bold mb-6">Transcription Jobs</h2>
            <div className="space-y-4">
              {transcriptionJobs.map((job, index) => (
                <div
                  key={job.id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          job.status === "completed" 
                            ? "text-green-600 bg-green-50" 
                            : job.status === "error"
                            ? "text-red-600 bg-red-50"
                            : "text-yellow-600 bg-yellow-50"
                        }`}>
                          {job.status === "completed" ? "✓ Completed" : 
                           job.status === "error" ? "✗ Failed" : 
                           "⏳ Processing"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>URL:</strong> {job.url}
                      </p>
                      {job.error && (
                        <p className="text-sm text-red-600 mb-2">
                          <strong>Error:</strong> {job.error}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {job.status === "processing" && (
                        <button
                          onClick={() => checkTranscriptionStatus(job.id)}
                          disabled={checkingStatus[job.id]}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {checkingStatus[job.id] ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Checking...
                            </>
                          ) : (
                            "Check Status"
                          )}
                        </button>
                      )}
                      {job.status === "completed" && job.transcription && (
                        <button
                          onClick={() => setTranscriptionModal({
                            show: true,
                            transcription: job.transcription,
                            jobId: job.id,
                            url: job.url
                          })}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                        >
                          View Transcription
                        </button>
                      )}
                    </div>
                  </div>
                  {job.transcription && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Transcription Preview:</strong>
                      </p>
                      <p className="text-sm text-gray-700">
                        {job.transcription.length > 200 
                          ? `${job.transcription.slice(0, 200)}...` 
                          : job.transcription}
                      </p>
            </div>
          )}
        </div>
              ))}
            </div>
          </div>
        )}

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

      {/* Transcription Modal */}
      {transcriptionModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Transcription Ready
              </h3>
              <button
                onClick={handleCloseTranscriptionModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Source URL:</strong> {transcriptionModal.url}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Job ID:</strong> {transcriptionModal.jobId}
              </p>
            </div>

            <div className="flex-1 mb-6 min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcription:
              </label>
              <div className="border border-gray-300 rounded-md p-4 h-96 overflow-y-auto bg-gray-50">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {transcriptionModal.transcription}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                onClick={handleCloseTranscriptionModal}
                disabled={loading.text}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleTrainFromModal}
                disabled={loading.text || !transcriptionModal.transcription.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading.text ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Training AI...
                  </>
                ) : (
                  "Train My AI with This Transcription"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
