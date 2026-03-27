"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LogOut, Plus, Send, X } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/app/lib/in-app-browser";
import FormatText from "@/app/components/FormatText";
import { WIDGET_SESSION_STORAGE_KEY } from "../constants";

const LEAD_JOURNEY_ROLE = "lead_journey";

export default function ChatBoxWidget({ brand }) {
  const { user, loading: authLoading, refresh } = useFirebaseSession();
  const endRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [input, setInput] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [chatRole, setChatRole] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [leadJourneyOptions, setLeadJourneyOptions] = useState([]);
  const [leadJourneysLoading, setLeadJourneysLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);
  const [logsError, setLogsError] = useState(null);

  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  const persistSession = useCallback((id) => {
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(WIDGET_SESSION_STORAGE_KEY, id);
    else localStorage.removeItem(WIDGET_SESSION_STORAGE_KEY);
  }, []);

  const loadSessions = useCallback(async () => {
    if (!user || !brand) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(
        `/api/widget/sessions?brand=${encodeURIComponent(brand)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      const list = data.sessions || [];
      setSessions(list);

      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem(WIDGET_SESSION_STORAGE_KEY)
          : null;
      const savedOk = saved && list.some((s) => s.id === saved);
      if (savedOk) setActiveSessionId(saved);
      else if (list[0]) {
        setActiveSessionId(list[0].id);
        persistSession(list[0].id);
      } else {
        setActiveSessionId(null);
        persistSession(null);
      }
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [user, brand, persistSession]);

  useEffect(() => {
    if (!authLoading && user && brand) loadSessions();
  }, [authLoading, user, brand, loadSessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeSessionId || authLoading || !user) {
      setChatRole(null);
      setSessionError(null);
      setSessionLoading(false);
      return;
    }
    setChatRole(null);
    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);

    fetch(`/api/session/${encodeURIComponent(activeSessionId)}`, {
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
          setSessionError("This session is not a lead journey chat.");
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
  }, [activeSessionId, user, authLoading]);

  useEffect(() => {
    if (!activeSessionId || authLoading || !user || chatRole !== LEAD_JOURNEY_ROLE) {
      setMessages([]);
      setSummary("");
      setLogsLoading(false);
      setLogsError(null);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);

    fetch(`/api/logs/${encodeURIComponent(activeSessionId)}`, {
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
      .catch((e) => {
        if (!cancelled) {
          setMessages([]);
          setLogsError(e.message || "Could not load messages.");
        }
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, user, authLoading, chatRole]);

  const handleSelectSession = (e) => {
    const id = e.target.value || null;
    setActiveSessionId(id);
    persistSession(id);
  };

  const closeServicePicker = () => {
    setServicePickerOpen(false);
    setPickerError(null);
    setLeadJourneyOptions([]);
  };

  useEffect(() => {
    if (!servicePickerOpen || newChatLoading) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setServicePickerOpen(false);
      setPickerError(null);
      setLeadJourneyOptions([]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [servicePickerOpen, newChatLoading]);

  const handleSelectLeadJourney = async (serviceKey, sessionTitle) => {
    if (!brand || newChatLoading || !user || !serviceKey) return;
    setNewChatLoading(true);
    setSessionError(null);
    try {
      const res = await fetch("/api/widget/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, serviceKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create chat");
      const id = data.sessionId;
      if (!id) throw new Error("No session id");
      setActiveSessionId(id);
      persistSession(id);
      setSessions((prev) => [
        {
          id,
          title: sessionTitle || "New chat",
          createdAt: new Date().toISOString(),
        },
        ...prev.filter((s) => s.id !== id),
      ]);
      setMessages([]);
      setSummary("");
      setChatRole(LEAD_JOURNEY_ROLE);
      closeServicePicker();
    } catch (err) {
      setSessionError(err.message || "Failed to start chat");
    } finally {
      setNewChatLoading(false);
    }
  };

  const openNewChatPicker = async () => {
    if (!brand || newChatLoading || !user || signingOut) return;
    setSessionError(null);
    setLeadJourneyOptions([]);
    setPickerError(null);
    setLeadJourneysLoading(true);
    try {
      const res = await fetch(
        `/api/widget/lead-journeys?brand=${encodeURIComponent(brand)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load services");
      const list = data.services || [];
      if (list.length === 0) {
        setSessionError("No lead journey is configured for this brand.");
        return;
      }
      if (list.length === 1) {
        await handleSelectLeadJourney(list[0].serviceKey, list[0].title);
        return;
      }
      setLeadJourneyOptions(list);
      setServicePickerOpen(true);
    } catch (err) {
      setSessionError(err.message || "Could not load services");
    } finally {
      setLeadJourneysLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (
      !text ||
      !activeSessionId ||
      sendLoading ||
      chatRole !== LEAD_JOURNEY_ROLE
    )
      return;

    setInput("");
    const userMsg = { role: "user", message: text, requery: null, id: null };
    const historyToUse = [...messages, userMsg];
    setMessages(historyToUse);
    setSendLoading(true);

    const rollbackFailedSend = () => {
      setInput(text);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          message: "Something went wrong. Please try again.",
        },
      ]);
    };

    try {
      const response = await fetch("/api/lead-journey", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyToUse,
          userMessage: text,
          sessionId: activeSessionId,
          summary,
        }),
      });

      if (!response.ok) {
        rollbackFailedSend();
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
    } catch {
      rollbackFailedSend();
    } finally {
      setSendLoading(false);
    }
  };

  const handleWidgetSignIn = async () => {
    setSigningIn(true);
    setSignInError("");
    setPopupBlocked(false);
    try {
      await signIn();
      await refresh();
    } catch (e) {
      if (e?.code === "auth/popup-blocked") {
        setPopupBlocked(true);
      } else {
        setSignInError(e.message || "Sign in failed");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleWidgetSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const res = await fetch("/api/logout", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        setSessionError("Could not sign out. Try again.");
        await refresh();
        return;
      }
      setSessionError(null);
      persistSession(null);
      setSessions([]);
      setActiveSessionId(null);
      setMessages([]);
      setSummary("");
      setInput("");
      setChatRole(null);
      setServicePickerOpen(false);
      setLeadJourneyOptions([]);
      setPickerError(null);
      setLeadJourneysLoading(false);
      await refresh();
    } catch {
      setSessionError("Could not sign out. Try again.");
      await refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const isBlocked = isInAppBrowser && isMobile;
  const canShowGoogleSignIn = !isBlocked;

  if (!brand) {
    return (
      <p className="py-4 text-sm text-muted">
        Add{" "}
        <code className="rounded bg-muted-bg px-1 text-xs">data-brand=&quot;subdomain&quot;</code>{" "}
        to the embed script (guest URL will include <code className="rounded bg-muted-bg px-1 text-xs">?brand=</code>
        ).
      </p>
    );
  }

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
      <div className="flex flex-1 flex-col justify-center gap-4 rounded-xl border border-border/60 bg-muted-bg/20 px-3 py-5 text-sm text-muted">
        <p className="text-center text-foreground">
          Sign in to use chat
        </p>
        {signInError && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">
            {signInError}
          </p>
        )}
        {popupBlocked && (
          <p className="text-center text-xs text-amber-800 dark:text-amber-200">
            Pop-up was blocked. Tap Sign in again or allow pop-ups for this site.
          </p>
        )}
        {isBlocked && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-foreground">
            <p className="text-xs">Please open in Chrome to sign in.</p>
            <button
              type="button"
              onClick={openInChrome}
              className="w-full rounded-lg bg-highlight px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              Open in Chrome
            </button>
          </div>
        )}
        {canShowGoogleSignIn && (
          <button
            type="button"
            onClick={handleWidgetSignIn}
            disabled={signingIn}
            className="mx-auto inline-flex w-full max-w-[240px] items-center justify-center rounded-xl bg-highlight px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {signingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in with Google"
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={activeSessionId || ""}
          onChange={handleSelectSession}
          disabled={sessionsLoading || sessions.length === 0}
          className="min-w-0 flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-xs text-foreground shadow-sm transition focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {sessions.length === 0 ? (
            <option value="">No widget chats yet</option>
          ) : (
            sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={openNewChatPicker}
          disabled={
            newChatLoading ||
            leadJourneysLoading ||
            sessionsLoading ||
            signingOut
          }
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border/50 bg-background px-2.5 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg disabled:opacity-50"
        >
          {newChatLoading || leadJourneysLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          New chat
        </button>
        <button
          type="button"
          onClick={handleWidgetSignOut}
          disabled={signingOut}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border/50 bg-background px-2.5 py-2 text-xs font-medium text-muted shadow-sm transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
          title="Sign out"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sign out
        </button>
      </div>

      {servicePickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] dark:bg-black/65 dark:backdrop-blur-sm"
          role="presentation"
          onClick={newChatLoading ? undefined : closeServicePicker}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="widget-picker-title"
            className="flex max-h-[min(85vh,520px)] w-full max-w-sm min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl ring-1 ring-border/60 dark:shadow-black/50 dark:ring-border/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-card px-3 py-2.5 dark:bg-card">
              <p
                id="widget-picker-title"
                className="text-xs font-semibold text-foreground"
              >
                Choose a conversation
              </p>
              <button
                type="button"
                onClick={closeServicePicker}
                disabled={newChatLoading}
                className="rounded-md p-1 text-muted transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 max-h-[min(72vh,440px)] overflow-y-auto px-3 py-3">
              {leadJourneysLoading && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  Loading options…
                </p>
              )}
              {pickerError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {pickerError}
                </p>
              )}
              {!leadJourneysLoading &&
                !pickerError &&
                leadJourneyOptions.length > 0 && (
                  <ul className="flex flex-col gap-1.5">
                    {leadJourneyOptions.map((opt) => (
                      <li key={opt.serviceKey}>
                        <button
                          type="button"
                          disabled={newChatLoading}
                          onClick={() =>
                            handleSelectLeadJourney(opt.serviceKey, opt.title)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition hover:bg-muted-bg focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50 dark:bg-muted-bg/30 dark:hover:bg-muted-bg"
                        >
                          {opt.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </div>
      )}

      {sessionError && (
        <p className="text-xs text-red-600 dark:text-red-400">{sessionError}</p>
      )}

      {!activeSessionId && !sessionsLoading && !servicePickerOpen && (
        <p className="text-xs text-muted">Create a chat with New chat.</p>
      )}

      {sessionLoading && activeSessionId && (
        <p className="text-xs text-muted">Loading session…</p>
      )}

      {logsLoading && activeSessionId && chatRole === LEAD_JOURNEY_ROLE && (
        <p className="text-xs text-muted">Loading messages…</p>
      )}

      {logsError &&
        activeSessionId &&
        chatRole === LEAD_JOURNEY_ROLE &&
        !logsLoading && (
          <p className="text-xs text-red-600 dark:text-red-400">{logsError}</p>
        )}

      {activeSessionId && chatRole === LEAD_JOURNEY_ROLE && !logsLoading && (
        <>
          <div className="scrollbar-thin min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden border-t border-border/25 bg-muted-bg/20 p-3 dark:border-border/20 dark:bg-muted-bg/10">
            {messages.length === 0 && (
              <p className="py-8 text-center text-xs text-muted">
                Say hi to start.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={m.id != null ? String(m.id) : `${m.role}-${i}`}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[min(100%,22rem)] min-w-0 rounded-2xl rounded-br-md bg-highlight px-4 py-2.5 text-sm text-white shadow-md"
                    : "mr-auto w-full max-w-full min-w-0 rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm text-foreground shadow-sm dark:bg-card/90"
                }
              >
                {m.role === "assistant" ? (
                  <div className="min-w-0 max-w-full overflow-hidden [word-break:break-word] [overflow-wrap:anywhere] [&_.prose]:max-w-none [&_.prose]:break-words [&_.prose_p]:leading-relaxed [&_a]:break-all [&_code]:break-all">
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
              <div className="mr-auto flex w-fit max-w-full items-center gap-2 rounded-2xl bg-muted-bg px-3.5 py-2 text-xs text-muted shadow-sm dark:bg-muted-bg/80">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 gap-2 border-t border-border/40 pt-3 dark:border-border/30"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message…"
              disabled={sendLoading}
              className="min-w-0 flex-1 rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/25"
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
        </>
      )}
    </div>
  );
}
