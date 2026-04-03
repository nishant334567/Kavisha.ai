"use client";

import { useState, useEffect, useCallback } from "react";
import FormatText from "@/app/components/FormatText";
import { formatToIST, formatTimeOnlyIST } from "@/app/utils/formatToIST";
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

  const time = (d) => formatTimeOnlyIST(d);

  if (!sessionId) return null;
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ring border-t-transparent" />
        <p className="mt-3 text-sm font-medium">Loading...</p>
      </div>
    );
  if (error) return <div className="py-16 text-center text-sm text-red-600">{error}</div>;
  if (!session) return <div className="py-16 text-center text-sm text-muted">Session not found</div>;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <header className="flex-shrink-0 border-b border-border bg-muted-bg px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-highlight">{session.title || "Chat"}</h2>
            {session.user && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="truncate">{session.user.name || session.user.email || "—"}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-ring" aria-hidden />
              {session.messageCount ?? 0} messages
            </span>
            <span className="flex items-center gap-1.5" title={session.updatedAt && formatToIST(session.updatedAt)}>
              <Clock className="h-3.5 w-3.5 text-ring" aria-hidden />
              {session.updatedAt ? formatToIST(session.updatedAt) : "—"}
            </span>
            {(Array.isArray(session.assignedTo) ? session.assignedTo.length : session.assignedTo) && (
              <span className="rounded border border-border bg-card px-1.5 py-0.5">{Array.isArray(session.assignedTo) ? session.assignedTo.join(", ") : session.assignedTo}</span>
            )}
            {session.status && <span className="capitalize text-muted">{session.status}</span>}
          </div>
        </div>
        {session.chatSummary && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{session.chatSummary}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted">
            <FileText className="mb-2 h-10 w-10 text-muted" aria-hidden />
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
                      ? "border border-border bg-card"
                      : "border border-border bg-muted-bg"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    <FormatText text={log?.message} />
                  </div>
                  {log.role === "assistant" && (
                    <>
                      {Array.isArray(log.sourceUrls) && log.sourceUrls.length > 0 && (
                        <div className="mt-2 border-t border-border/50 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {log.sourceUrls.map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[200px] truncate rounded border border-border bg-card px-2 py-1 text-xs text-ring hover:bg-muted-bg"
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
                          <div className="flex flex-wrap gap-1.5">
                            {log.sourceChunkIds.map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => openChunk(id)}
                                className="max-w-[180px] truncate rounded border border-border bg-card px-2 py-1 text-xs text-ring hover:bg-muted-bg"
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
                  <p className="mt-1.5 text-[10px] text-muted">{time(log.createdAt)}</p>
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
