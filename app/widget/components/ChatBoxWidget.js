"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LogOut, Plus, Send, Users, X } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import { signIn } from "@/app/lib/firebase/sign-in";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/app/lib/in-app-browser";
import FormatText from "@/app/components/FormatText";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";
import { WIDGET_SESSION_STORAGE_KEY } from "../constants";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";
import WidgetIntroTypewriter from "./WidgetIntroTypewriter";

const LEAD_JOURNEY_ROLE = "lead_journey";

/** Opens this brand's Kavisha community in a new tab (matches BrandContext localhost ?subdomain=). */
function buildBrandCommunityUrl(subdomain) {
  if (typeof window === "undefined") return "#";
  const s = String(subdomain || "").trim().toLowerCase();
  if (!s || !/^[a-z0-9-]+$/i.test(s)) return "#";
  const { hostname, port, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const p = port ? `:${port}` : "";
    return `${protocol}//${hostname}${p}/community?subdomain=${encodeURIComponent(s)}`;
  }
  if (hostname.includes(".staging.")) {
    return `https://${s}.staging.kavisha.ai/community`;
  }
  return `https://${s}.kavisha.ai/community`;
}

export default function ChatBoxWidget({ brand, primaryColor = null }) {
  const { user, loading: authLoading, refresh } = useFirebaseSession();
  const endRef = useRef(null);
  const primaryHex = normalizeBrandHex(primaryColor);

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
  /** Lead journey starter prompts from Sanity (same as main ChatBox). */
  const [introQuestions, setIntroQuestions] = useState([]);
  /** Set when POST /api/widget/session succeeds; enables one-time intro typewriter for that id. */
  const [introTypewriterSessionId, setIntroTypewriterSessionId] = useState(null);

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
    if (
      introTypewriterSessionId &&
      introTypewriterSessionId !== activeSessionId
    ) {
      setIntroTypewriterSessionId(null);
    }
  }, [activeSessionId, introTypewriterSessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeSessionId || authLoading || !user) {
      setChatRole(null);
      setSessionError(null);
      setSessionLoading(false);
      setIntroQuestions([]);
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
        setIntroQuestions(
          role === LEAD_JOURNEY_ROLE && Array.isArray(data.introQuestions)
            ? data.introQuestions
            : []
        );
        if (role !== LEAD_JOURNEY_ROLE) {
          setSessionError("This session is not a lead journey chat.");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setSessionError(e.message || "Could not load session");
          setChatRole(null);
          setIntroQuestions([]);
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
              sourceCards: row.sourceCards,
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
    setIntroTypewriterSessionId(null);
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
      setIntroTypewriterSessionId(id);
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

  async function sendUserMessage(rawText) {
    const text = String(rawText ?? "").trim();
    if (
      !text ||
      !activeSessionId ||
      sendLoading ||
      chatRole !== LEAD_JOURNEY_ROLE
    )
      return;

    setIntroTypewriterSessionId(null);
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
          sourceCards: data?.sourceCards || [],
        },
      ]);
    } catch {
      rollbackFailedSend();
    } finally {
      setSendLoading(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    void sendUserMessage(input);
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
              className={`w-full rounded-lg px-3 py-2 text-xs font-medium text-white hover:opacity-90 ${!primaryHex ? "bg-highlight" : ""}`}
              style={primaryHex ? { backgroundColor: primaryHex } : undefined}
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
            className={`mx-auto inline-flex w-full max-w-[240px] items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 ${!primaryHex ? "bg-highlight" : ""}`}
            style={
              primaryHex
                ? {
                    backgroundColor: primaryHex,
                    boxShadow: `0 2px 8px ${hexToRgba(primaryHex, 0.28) || "rgba(0,0,0,0.08)"}`,
                  }
                : undefined
            }
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
        <button
          type="button"
          onClick={() =>
            window.open(buildBrandCommunityUrl(brand), "_blank", "noopener,noreferrer")
          }
          className="mx-auto inline-flex w-full max-w-[240px] items-center justify-center gap-2 rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
        >
          <Users className="h-4 w-4 shrink-0" />
          Community
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-col gap-2">
        <select
          value={activeSessionId || ""}
          onChange={handleSelectSession}
          disabled={sessionsLoading || sessions.length === 0}
          className="w-full min-w-0 rounded-xl border border-border/50 bg-background px-3 py-2 text-xs text-foreground shadow-sm transition focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
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
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={openNewChatPicker}
            disabled={
              newChatLoading ||
              leadJourneysLoading ||
              sessionsLoading ||
              signingOut
            }
            className={`flex min-h-9 min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-1 text-[11px] font-medium shadow-sm transition hover:opacity-92 disabled:opacity-50 ${
              primaryHex
                ? "border border-transparent text-white"
                : "border border-border/50 bg-background text-foreground hover:bg-muted-bg"
            }`}
            style={
              primaryHex
                ? {
                    backgroundColor: primaryHex,
                    boxShadow: `0 2px 10px ${hexToRgba(primaryHex, 0.32) || "rgba(0,0,0,0.1)"}`,
                  }
                : undefined
            }
          >
            {newChatLoading || leadJourneysLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0 truncate">New chat</span>
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(buildBrandCommunityUrl(brand), "_blank", "noopener,noreferrer")
            }
            className="flex min-h-9 min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition hover:bg-muted-bg"
            title="Open community in a new tab"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">Community</span>
          </button>
          <button
            type="button"
            onClick={handleWidgetSignOut}
            disabled={signingOut}
            className="flex min-h-9 min-w-0 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background px-2 py-1 text-[11px] font-medium text-muted shadow-sm transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
            title="Sign out"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0 truncate">Sign out</span>
          </button>
        </div>
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
            {messages.length === 0 && !logsLoading && (
              <p className="py-8 text-center text-xs text-muted">
                {introQuestions.length > 0
                  ? "Pick a starter question below or type a message."
                  : "Say hi to start."}
              </p>
            )}
            {messages.map((m, i) => {
              const introTypewriterActive =
                m.role === "assistant" &&
                i === 0 &&
                introTypewriterSessionId &&
                introTypewriterSessionId === activeSessionId;
              return (
              <div
                key={m.id != null ? String(m.id) : `${m.role}-${i}`}
                className={
                  m.role === "user"
                    ? `ml-auto max-w-[min(100%,22rem)] min-w-0 rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white ${!primaryHex ? "bg-highlight shadow-md" : ""}`
                    : "mr-auto w-full max-w-full min-w-0 rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm text-foreground shadow-sm dark:bg-card/90"
                }
                style={
                  m.role === "user" && primaryHex
                    ? {
                        backgroundColor: primaryHex,
                        boxShadow: `0 4px 14px -3px ${hexToRgba(primaryHex, 0.42) || "rgba(0,0,0,0.12)"}, 0 0 0 1px ${hexToRgba(primaryHex, 0.18) || "transparent"}`,
                      }
                    : undefined
                }
              >
                {m.role === "assistant" ? (
                  <div className="min-w-0 max-w-full">
                    {introTypewriterActive ? (
                      <WidgetIntroTypewriter
                        text={m.message || ""}
                        scrollRef={endRef}
                        onComplete={() => setIntroTypewriterSessionId(null)}
                      />
                    ) : (
                      <>
                        <div className="min-w-0 max-w-full overflow-hidden [word-break:break-word] [overflow-wrap:anywhere] [&_.prose]:max-w-none [&_.prose]:break-words [&_.prose_p]:leading-relaxed [&_a]:break-all [&_code]:break-all">
                          <FormatText text={m.message || ""} />
                        </div>
                        {Array.isArray(m.sourceCards) &&
                        m.sourceCards.length > 0 ? (
                          <AssistantSourceCards
                            items={m.sourceCards}
                            primaryHex={primaryHex}
                          />
                        ) : Array.isArray(m.sourceUrls) &&
                          m.sourceUrls.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/25 pt-2 dark:border-border/30">
                            <span className="text-xs text-muted">Links:</span>
                            {m.sourceUrls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`max-w-full break-all rounded-md px-2 py-0.5 text-xs transition-colors hover:underline ${
                                  primaryHex
                                    ? "font-medium"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
                                }`}
                                style={
                                  primaryHex
                                    ? {
                                        backgroundColor:
                                          hexToRgba(primaryHex, 0.12) ||
                                          undefined,
                                        color: primaryHex,
                                      }
                                    : undefined
                                }
                              >
                                {url.length > 36 ? `${url.slice(0, 36)}…` : url}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                    <AssistantReplyCopyButton
                      className="mt-2"
                      message={m.message}
                      sourceCards={m.sourceCards}
                      sourceUrls={m.sourceUrls}
                    />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap [word-break:break-word] [overflow-wrap:anywhere]">
                    {m.message}
                  </p>
                )}
              </div>
            );
            })}
            {sendLoading && (
              <ChatThinkingRow
                className="mr-auto"
                brandSlug={brand}
                primaryColor={primaryColor}
                variant="outline"
              />
            )}
            <div ref={endRef} />
          </div>

          {introQuestions.length > 0 &&
            !messages.some((m) => m.role === "user") &&
            !sendLoading && (
              <div className="shrink-0 border-t border-border/25 px-1 py-2 dark:border-border/20">
                <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                  {introQuestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void sendUserMessage(q)}
                      disabled={sendLoading}
                      className="max-w-[min(280px,85vw)] shrink-0 rounded-xl border border-border/50 bg-background px-3 py-2 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted-bg disabled:opacity-50 dark:border-border/40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              className={`min-w-0 flex-1 rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-border focus:outline-none ${
                primaryHex ? "focus:ring-2 focus:ring-offset-1" : "focus:ring-2 focus:ring-ring/25"
              }`}
              onFocus={(e) => {
                if (!primaryHex) return;
                const ring = hexToRgba(primaryHex, 0.35);
                if (ring) e.target.style.boxShadow = `0 0 0 2px ${ring}`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "";
              }}
            />
            <button
              type="submit"
              disabled={sendLoading || !input.trim()}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition hover:opacity-90 disabled:opacity-40 ${!primaryHex ? "bg-highlight" : ""}`}
              style={
                primaryHex
                  ? {
                      backgroundColor: primaryHex,
                      boxShadow: `0 2px 8px ${hexToRgba(primaryHex, 0.3) || "rgba(0,0,0,0.1)"}`,
                    }
                  : undefined
              }
              aria-label="Send"
            >
              {sendLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <p
            className={`mt-2 shrink-0 text-center text-xs ${
              primaryHex ? "" : "text-muted"
            }`}
            style={primaryHex ? { color: primaryHex } : undefined}
          >
            Powered by{" "}
            <a
              href="https://kavisha.ai"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold underline-offset-2 hover:underline ${
                primaryHex ? "" : "text-highlight"
              }`}
            >
              Kavisha
            </a>
          </p>
        </>
      )}
    </div>
  );
}