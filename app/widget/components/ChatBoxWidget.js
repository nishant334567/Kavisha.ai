"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import FormatText from "@/app/components/FormatText";

const LEAD_JOURNEY_ROLE = "lead_journey";

export default function ChatBoxWidget({ sessionId }) {
  const { user, loading: authLoading } = useFirebaseSession();
  const endRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [input, setInput] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [chatRole, setChatRole] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!sessionId || authLoading || !user) {
      setChatRole(null);
      setSessionError(null);
      setSessionLoading(false);
      return;
    }

    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);

    fetch(`/api/session/${encodeURIComponent(sessionId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Session ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const role = (data.role || "").toLowerCase();
        setChatRole(role);
        if (role !== LEAD_JOURNEY_ROLE) {
          setSessionError(
            "This embed only supports lead journey chats. Open this session on Kavisha or pick a lead journey session."
          );
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setSessionError(e.message || "Could not load session");
          setChatRole(null);
        }
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, user, authLoading]);

  useEffect(() => {
    if (!sessionId || authLoading || !user || chatRole !== LEAD_JOURNEY_ROLE) {
      setMessages([]);
      setSummary("");
      setLogsLoading(false);
      return;
    }

    let cancelled = false;
    setLogsLoading(true);

    fetch(`/api/logs/${encodeURIComponent(sessionId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setMessages(
            data.map((row) => ({
              id: row._id,
              role: row.role,
              message: row.message || "",
              requery: null,
              sourceUrls: row.sourceUrls,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, user, authLoading, chatRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !sessionId || sendLoading || chatRole !== LEAD_JOURNEY_ROLE) return;

    setInput("");
    const userMsg = { role: "user", message: text, requery: null, id: null };
    const historyToUse = [...messages, userMsg];
    setMessages(historyToUse);
    setSendLoading(true);

    try {
      const response = await fetch("/api/lead-journey", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyToUse,
          userMessage: text,
          sessionId,
          summary,
        }),
      });

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            message:
              "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const data = await response.json();
      setSummary(data?.summary ?? "");

      const withRequery = historyToUse.map((msg, idx) => {
        if (idx === historyToUse.length - 1 && msg.role === "user") {
          return { ...msg, requery: data?.requery ?? null };
        }
        return msg;
      });

      setMessages([
        ...withRequery,
        {
          id: null,
          role: "assistant",
          message: data.reply ?? "",
          sourceUrls: data?.sourceUrls || [],
        },
      ]);
    } finally {
      setSendLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 px-1 py-4 text-sm text-muted">
        <p>Sign in to use chat.</p>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-highlight px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <p className="py-4 text-sm text-muted">
        Set a session id in{" "}
        <code className="rounded bg-muted-bg px-1 text-xs">localStorage</code>{" "}
        to load a lead journey chat.
      </p>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading session…
      </div>
    );
  }

  if (sessionError) {
    return <p className="py-3 text-sm text-red-600">{sessionError}</p>;
  }

  if (logsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading messages…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="scrollbar-thin min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-2xl bg-muted-bg/40 p-3 ring-1 ring-border/60">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">
            Say hi to start.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id != null ? String(m.id) : `${m.role}-${i}`}
            className={
              m.role === "user"
                ? "ml-auto max-w-[min(100%,22rem)] min-w-0 rounded-2xl rounded-br-md bg-highlight px-3.5 py-2.5 text-sm text-white shadow-sm"
                : "mr-auto w-full max-w-full min-w-0 rounded-2xl rounded-bl-md border border-border/80 bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm"
            }
          >
            {m.role === "assistant" ? (
              <div className="widget-markdown min-w-0 max-w-full overflow-hidden [word-break:break-word] [overflow-wrap:anywhere] [&_.prose]:max-w-none [&_.prose]:break-words [&_.prose_p]:leading-relaxed [&_a]:break-all [&_code]:break-all">
                <FormatText text={m.message || ""} />
              </div>
            ) : (
              <p className="whitespace-pre-wrap [word-break:break-word] [overflow-wrap:anywhere]">
                {m.message}
              </p>
            )}
          </div>
        ))}
        {sendLoading && (
          <div className="mr-auto flex w-fit max-w-full items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-muted shadow-sm">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-border/80 pt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          disabled={sendLoading}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          disabled={sendLoading || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-highlight text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          aria-label="Send"
        >
          {sendLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
