"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Send } from "lucide-react";

function formatTime(createdAt) {
  const d = new Date(createdAt);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  return d.toLocaleDateString();
}

export default function CommentModal({ sessionId, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, comment: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#3D5E6B]">
          <h2 className="font-semibold text-white">Comments</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 "
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#122A34]">
          {loading ? (
            <p className="text-sm ">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm ">No comment</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => {
                const initial = (c.authorName || "A").charAt(0).toUpperCase();
                return (
                  <li key={c._id} className="flex gap-3 text-sm">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3D5E6B] text-white flex items-center justify-center text-sm font-medium"
                      aria-hidden
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white whitespace-pre-wrap">{c.comment}</p>
                      <p className="text-xs text-white/70 mt-0.5">{formatTime(c.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="bg-[#122A34] flex-shrink-0 p-4">
          <div className="relative flex items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="w-full min-w-0 rounded-2xl bg-[#DBEAEA] pl-4 pr-12 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#004A4E] focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#004A4E] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
