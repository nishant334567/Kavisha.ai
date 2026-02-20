"use client";

import { useState, useEffect, useCallback } from "react";
import FormatText from "@/app/components/FormatText";
import { formatToIST } from "@/app/utils/formatToIST";
import { MessageCircle, Clock, User, FileText } from "lucide-react";
import ChunkDetailModal from "./ChunkDetailModal";

export default function AdminChatSessionView({ sessionId }) {
  const [session, setSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chunkDetail, setChunkDetail] = useState(null);
  const [chunkLoading, setChunkLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/session-logs/${sessionId}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.message || "Failed to load");
          return;
        }
        setSession(data.session ?? null);
        setLogs(data.logs ?? []);
      } catch {
        setError("Failed to load session");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const openChunk = useCallback(
    async (chunkId) => {
      if (!chunkId || !session?.brand) return;
      setChunkLoading(true);
      setChunkDetail(null);
      try {
        const res = await fetch(
          `/api/admin/fetch-chunk?chunkId=${encodeURIComponent(chunkId)}&brand=${encodeURIComponent(session.brand)}`
        );
        const data = await res.json();
        setChunkDetail({
          chunk: data.chunk || { id: chunkId, title: "", text: "Not found." },
          document: data.document ?? null,
        });
      } catch {
        setChunkDetail({ chunk: { id: chunkId, title: "", text: "Failed to load." }, document: null });
      } finally {
        setChunkLoading(false);
      }
    },
    [session?.brand]
  );

  const time = (d) =>
    d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "—";

  if (!sessionId) return null;
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#42476D]">
        <div className="w-8 h-8 border-2 border-[#7981C2] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm font-medium">Loading...</p>
      </div>
    );
  if (error) return <div className="py-16 text-center text-sm text-red-600">{error}</div>;
  if (!session) return <div className="py-16 text-center text-sm text-gray-500">Session not found</div>;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
      <header className="flex-shrink-0 bg-[#EEF0FE] border-b border-[#BFC4E5] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="min-w-0">
            <h2 className="font-semibold text-[#42476D] truncate">{session.title || "Chat"}</h2>
            {session.user && (
              <p className="flex items-center gap-1.5 text-xs text-[#898989] mt-0.5">
                <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="truncate">{session.user.name || session.user.email || "—"}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#42476D]">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-[#7981C2]" aria-hidden />
              {session.messageCount ?? 0} messages
            </span>
            <span className="flex items-center gap-1.5" title={session.updatedAt && formatToIST(session.updatedAt)}>
              <Clock className="w-3.5 h-3.5 text-[#7981C2]" aria-hidden />
              {session.updatedAt ? formatToIST(session.updatedAt) : "—"}
            </span>
            {(Array.isArray(session.assignedTo) ? session.assignedTo.length : session.assignedTo) && (
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#BFC4E5]">{Array.isArray(session.assignedTo) ? session.assignedTo.join(", ") : session.assignedTo}</span>
            )}
            {session.status && <span className="capitalize text-[#898989]">{session.status}</span>}
          </div>
        </div>
        {session.chatSummary && (
          <p className="mt-2 text-xs text-[#42476D] line-clamp-2 leading-relaxed">{session.chatSummary}</p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 bg-[#EEF0FE]/30 min-h-0">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
            <FileText className="w-10 h-10 text-gray-300 mb-2" aria-hidden />
            No messages
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log, i) => (
              <div
                key={log._id || i}
                className={`flex ${log.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    log.role === "user"
                      ? "bg-white border border-[#BFC4E5]"
                      : "bg-[#EEF0FE] border border-[#BFC4E5]"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    <FormatText text={log?.message} />
                  </div>
                  {log.role === "assistant" && (
                    <>
                      {Array.isArray(log.sourceUrls) && log.sourceUrls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#BFC4E5]/50">
                          <div className="flex flex-wrap gap-1.5">
                            {log.sourceUrls.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-2 py-1 rounded bg-white border border-[#BFC4E5] text-[#7981C2] hover:bg-[#EEF0FE] truncate max-w-[200px]"
                                title={url}
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(log.sourceChunkIds) && log.sourceChunkIds.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[#BFC4E5]/50">
                          <div className="flex flex-wrap gap-1.5">
                            {log.sourceChunkIds.map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => openChunk(id)}
                                className="text-xs px-2 py-1 rounded bg-white border border-[#BFC4E5] text-[#7981C2] hover:bg-[#EEF0FE] truncate max-w-[180px]"
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
                  <p className="text-[10px] text-[#898989] mt-1.5">{time(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
