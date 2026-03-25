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
        if (data.chunk) {
          setChunkDetail({ chunk: data.chunk, document: data.document ?? null });
        } else {
          setChunkDetail({
            chunk: { id: chunkId, title: "", text: "Chunk not found." },
            document: null,
          });
        }
      } catch {
        setChunkDetail({
          chunk: { id: chunkId, title: "", text: "Failed to load chunk." },
          document: null,
        });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowLogsModal(false);
          setSelectedSessionLogs(null);
        }
      }}
    >
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border bg-muted-bg p-3 sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-highlight text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm">
              {(selectedSessionLogs.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-highlight sm:text-lg">
                {selectedSessionLogs.user?.name || "Unknown User"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowLogsModal(false);
              setSelectedSessionLogs(null);
            }}
            className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card hover:text-foreground"
            aria-label="Close Logs"
          >
            <X className="w-5 h-5 text-highlight" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-6">
          {1 === 2 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-highlight"></div>
                <div className="font-medium text-muted">
                  Loading chat logs...
                </div>
              </div>
            </div>
          ) : selectedSessionLogs.logs &&
            selectedSessionLogs.logs.length > 0 ? (
            <div className="space-y-4">
              {/* Date header */}
              {getFirstMessageDate() && (
                <div className="mb-4 text-center text-sm text-muted">
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
                    className={`max-w-[85%] rounded-2xl border px-4 py-3 ${log.role === "user"
                      ? "border-border bg-card text-foreground"
                      : "border-border bg-muted-bg text-foreground"
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      <FormatText text={log?.message} />
                    </div>
                    {log.role === "assistant" && (
                      <>
                        {Array.isArray(log.sourceUrls) && log.sourceUrls.length > 0 && (
                          <div className="mt-2 border-t border-border/50 pt-2">
                            <p className="mb-1.5 text-xs text-muted">Source URLs:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.sourceUrls.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="max-w-[180px] truncate rounded-md bg-[#004A4E]/5 px-2 py-1 text-xs text-highlight underline hover:bg-[#004A4E]/10 sm:max-w-[280px]"
                                  title={url}
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(log.sourceChunkIds) && log.sourceChunkIds.length > 0 && (
                          <div className="mt-2 border-t border-border/50 pt-2">
                            <p className="mb-1.5 text-xs text-muted">Source chunks:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.sourceChunkIds.map((id) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => openChunkDetail(id)}
                                  className="max-w-[180px] truncate rounded-md bg-[#004A4E]/10 px-2 py-1 text-xs text-highlight hover:bg-[#004A4E]/20 sm:max-w-[240px]"
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
                    <div className="mt-2 text-xs text-muted">
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted-bg">
                <FileText className="w-8 h-8 text-muted" />
              </div>
              <h4 className="mb-2 text-lg font-medium text-foreground">
                No chat logs available
              </h4>
              <p className="text-muted">
                This session doesn't have any chat logs yet.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-card p-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:p-4 sm:text-sm">
          <div>
            <span>Total messages: {selectedSessionLogs.logs?.length || 0}</span>
          </div>
          <div className="text-xs text-muted">
            {selectedSessionLogs.logs?.length > 0 &&
              `Last message: ${formatFooterDate(selectedSessionLogs.logs[selectedSessionLogs.logs.length - 1]?.createdAt)}`}
          </div>
        </div>
      </div>

      <ChunkDetailModal
        open={!!chunkDetail || chunkLoading}
        loading={chunkLoading}
        chunk={chunkDetail?.chunk}
        document={chunkDetail?.document}
        onClose={() => setChunkDetail(null)}
      />
    </div>
  );
}
