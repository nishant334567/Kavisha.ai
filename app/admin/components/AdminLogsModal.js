"use client";

import { useState, useCallback } from "react";
import FormatText from "@/app/components/FormatText";
import { X, FileText } from "lucide-react";
import ChunkDetailModal from "./ChunkDetailModal";

export default function AdminLogsModal({
  selectedSessionLogs,
  setShowLogsModal,
  setSelectedSessionLogs,
  brand: brandProp,
  //   loadingLogs,
}) {
  const brand = brandProp || selectedSessionLogs?.brand || "";
  const [chunkDetail, setChunkDetail] = useState(null);
  const [chunkLoading, setChunkLoading] = useState(false);

  const openChunkDetail = useCallback(
    async (chunkId) => {
      if (!chunkId || !brand) return;
      setChunkLoading(true);
      setChunkDetail(null);
      try {
        const res = await fetch(
          `/api/admin/fetch-chunk?chunkId=${encodeURIComponent(chunkId)}&brand=${encodeURIComponent(brand)}`
        );
        const data = await res.json();
        if (data.chunk) setChunkDetail(data.chunk);
        else setChunkDetail({ id: chunkId, title: "", text: "Chunk not found." });
      } catch {
        setChunkDetail({ id: chunkId, title: "", text: "Failed to load chunk." });
      } finally {
        setChunkLoading(false);
      }
    },
    [brand]
  );
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatFooterDate = (dateString) => {
    const date = new Date(dateString);
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
    return `${date.getDate()} ${months[date.getMonth()]}. ${date.getFullYear()}, ${formatTime(dateString)}`;
  };

  const getFirstMessageDate = () => {
    if (selectedSessionLogs.logs && selectedSessionLogs.logs.length > 0) {
      return formatDate(selectedSessionLogs.logs[0].createdAt);
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowLogsModal(false);
          setSelectedSessionLogs(null);
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
              {(selectedSessionLogs.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-medium text-gray-900 truncate">
                {selectedSessionLogs.user?.name || "Unknown User"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowLogsModal(false);
              setSelectedSessionLogs(null);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-2"
            aria-label="Close Logs"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-blue-50">
          {1 === 2 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <div className="text-gray-600 font-medium">
                  Loading chat logs...
                </div>
              </div>
            </div>
          ) : selectedSessionLogs.logs &&
            selectedSessionLogs.logs.length > 0 ? (
            <div className="space-y-4">
              {/* Date header */}
              {getFirstMessageDate() && (
                <div className="text-center text-sm text-gray-600 mb-4">
                  {getFirstMessageDate()}
                </div>
              )}
              {selectedSessionLogs.logs.map((log, index) => (
                <div
                  key={log._id || index}
                  className={`flex ${log.role === "user" ? "justify-start" : "justify-end"
                    }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${log.role === "user"
                        ? "bg-white text-gray-800"
                        : "bg-blue-200 text-gray-800 border border-blue-300"
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      <FormatText text={log?.message} />
                    </div>
                    {log.role === "assistant" && (
                      <>
                        {Array.isArray(log.sourceUrls) && log.sourceUrls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-300/50">
                            <p className="text-xs text-gray-600 mb-1.5">Source URLs:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.sourceUrls.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 underline truncate max-w-[180px] sm:max-w-[280px]"
                                  title={url}
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(log.sourceChunkIds) && log.sourceChunkIds.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-300/50">
                            <p className="text-xs text-gray-600 mb-1.5">Source chunks:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.sourceChunkIds.map((id) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => openChunkDetail(id)}
                                  className="text-xs px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-800 truncate max-w-[180px] sm:max-w-[240px]"
                                  title={id}
                                >
                                  {id}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-xs mt-2 text-gray-500">
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No chat logs available
              </h4>
              <p className="text-gray-500">
                This session doesn't have any chat logs yet.
              </p>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
          <div>
            <span>Total messages: {selectedSessionLogs.logs?.length || 0}</span>
          </div>
          <div className="text-xs text-gray-500">
            {selectedSessionLogs.logs?.length > 0 &&
              `Last message: ${formatFooterDate(selectedSessionLogs.logs[selectedSessionLogs.logs.length - 1]?.createdAt)}`}
          </div>
        </div>
      </div>

      <ChunkDetailModal
        open={!!chunkDetail || chunkLoading}
        loading={chunkLoading}
        chunk={chunkDetail}
        onClose={() => setChunkDetail(null)}
      />
    </div>
  );
}
