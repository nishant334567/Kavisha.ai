"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, LogOut, Plus, Send, Users, X } from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  clearWidgetAuth,
  commitWidgetAuth,
  getCurrentWidgetUser,
  subscribeWidgetSession,
  widgetAwareFetch,
  WIDGET_AUTH_POSTMESSAGE_SOURCE,
} from "@/app/lib/widget-session";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/app/lib/in-app-browser";
import FormatText from "@/app/components/FormatText";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";
import WidgetIntroTypewriter from "./WidgetIntroTypewriter";
import WidgetChatLoader, {
  WIDGET_LOADER_MESSAGES,
  widgetLoaderMessagesFromFlags,
} from "./WidgetChatLoader";
import { WIDGET_SSO_MESSAGE_TYPE } from "../constants";
import { signInWithPartnerCustomToken } from "@/app/lib/firebase/sign-in-custom-token";

const LEAD_JOURNEY_ROLE = "lead_journey";

/** `{brand}.kavisha.ai` (or localhost / staging) — where `/widget-login` opens. */
function brandWidgetLoginBase(brandSlug) {
  const s = String(brandSlug || "").trim().toLowerCase();
  if (!s || !/^[a-z0-9-]+$/i.test(s)) return null;
  if (typeof window === "undefined") return null;
  const { hostname, port, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const p = port ? `:${port}` : "";
    return `${protocol}//${hostname}${p}`;
  }
  if (hostname.includes(".staging.")) return `https://${s}.staging.kavisha.ai`;
  return `https://${s}.kavisha.ai`;
}

function brandWidgetLoginUrl(brandSlug) {
  if (typeof window === "undefined") return "/widget-login";
  const iframeOrigin = window.location.origin;
  const base = brandWidgetLoginBase(brandSlug) || iframeOrigin;
  const u = new URL("/widget-login", base);
  u.searchParams.set("origin", iframeOrigin);
  return u.toString();
}

function widgetSessionTitle(s) {
  const raw = String(s?.title || "").trim();
  return raw || "Chat";
}

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

export default function ChatBoxWidget({
  brand,
  primaryColor = null,
  secondaryColor = null,
  readMoreCopyUrl = "",
}) {
  const { user: firebaseUser, loading: authLoading, refresh } =
    useFirebaseSession();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [widgetUser, setWidgetUser] = useState(() =>
    typeof window !== "undefined" ? getCurrentWidgetUser() : null
  );
  const effectiveUser = firebaseUser || widgetUser;
  const endRef = useRef(null);
  const primaryHex = normalizeBrandHex(primaryColor);
  /** User message bubbles use brand primary when set. */
  const userBubbleHex = primaryHex;

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  /** True after the latest widget session list fetch finished (used to auto-start a fresh chat on open). */
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
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
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const historyMenuRef = useRef(null);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    return subscribeWidgetSession((session) => {
      setWidgetUser(session?.user || null);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMessage = (e) => {
      const d = e.data;
      if (!d || d.source !== WIDGET_AUTH_POSTMESSAGE_SOURCE) return;

      if (d.type === "auth-success") {
        commitWidgetAuth(d);
        void refreshRef.current();
        return;
      }

      if (d.type !== WIDGET_SSO_MESSAGE_TYPE) return;

      const SSO_LOG = "[kavisha-widget][sso]";
      const rawPartnerToken = d.token;
      const partnerToken =
        typeof rawPartnerToken === "string" ? rawPartnerToken.trim() : "";
      if (!partnerToken) {
        console.warn(`${SSO_LOG} ignored: missing or empty token`, {
          brand,
          tokenType: typeof rawPartnerToken,
          rawLength:
            typeof rawPartnerToken === "string"
              ? rawPartnerToken.length
              : undefined,
        });
        return;
      }

      console.info(`${SSO_LOG} handoff received; calling introspect`, {
        brand,
        partnerJwtLength: partnerToken.length,
      });

      void (async () => {
        setSigningIn(true);
        setSignInError("");
        try {
          const res = await fetch("/api/widget/sso-introspect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: partnerToken }),
            credentials: "omit",
          });
          const data = await res.json().catch(() => ({}));
          console.info(`${SSO_LOG} introspect finished`, {
            brand,
            httpStatus: res.status,
            ok: Boolean(data?.ok),
            error:
              typeof data?.error === "string" ? data.error : undefined,
          });
          if (!res.ok || !data?.ok) {
            throw new Error(
              typeof data?.error === "string"
                ? data.error
                : "Partner sign-in failed"
            );
          }
          if (!data.customToken) {
            throw new Error("Partner sign-in did not return a session token");
          }
          const payload = await signInWithPartnerCustomToken(data.customToken);
          commitWidgetAuth(payload);
          void refreshRef.current();
          console.info(`${SSO_LOG} firebase session committed`, { brand });
        } catch (err) {
          const message = err?.message || "Partner sign-in failed";
          console.warn(`${SSO_LOG} failed`, { brand, message });
          setSignInError(message);
        } finally {
          setSigningIn(false);
        }
      })();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [brand]);

  const loadSessions = useCallback(async () => {
    if (!effectiveUser || !brand) return;
    setSessionsHydrated(false);
    setSessionsLoading(true);
    try {
      const res = await widgetAwareFetch(
        `/api/widget/sessions?brand=${encodeURIComponent(brand)}`
      );
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      const list = data.sessions || [];
      setSessions(list);
      setActiveSessionId(null);
    } catch {
      setSessions([]);
      setActiveSessionId(null);
    } finally {
      setSessionsLoading(false);
      setSessionsHydrated(true);
    }
  }, [effectiveUser, brand]);

  useEffect(() => {
    if (!authLoading && effectiveUser && brand) loadSessions();
  }, [authLoading, effectiveUser, brand, loadSessions]);

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
    if (!activeSessionId || authLoading || !effectiveUser) {
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

    widgetAwareFetch(`/api/session/${encodeURIComponent(activeSessionId)}`)
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
  }, [activeSessionId, effectiveUser, authLoading]);

  useEffect(() => {
    if (
      !activeSessionId ||
      authLoading ||
      !effectiveUser ||
      chatRole !== LEAD_JOURNEY_ROLE
    ) {
      setMessages([]);
      setSummary("");
      setLogsLoading(false);
      setLogsError(null);
      return;
    }
    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);

    widgetAwareFetch(`/api/logs/${encodeURIComponent(activeSessionId)}`)
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
  }, [activeSessionId, effectiveUser, authLoading, chatRole]);

  const selectSessionById = useCallback((id) => {
    setIntroTypewriterSessionId(null);
    setActiveSessionId(id || null);
    setHistoryMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!historyMenuOpen) return;
    const onPointerDown = (e) => {
      if (
        historyMenuRef.current &&
        !historyMenuRef.current.contains(e.target)
      ) {
        setHistoryMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setHistoryMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [historyMenuOpen]);

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
    if (!brand || newChatLoading || !effectiveUser || !serviceKey) return;
    setNewChatLoading(true);
    setSessionError(null);
    try {
      const res = await widgetAwareFetch("/api/widget/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, serviceKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create chat");
      const id = data.sessionId;
      if (!id) throw new Error("No session id");
      setIntroTypewriterSessionId(id);
      setActiveSessionId(id);
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
    if (!brand || newChatLoading || !effectiveUser || signingOut) return;
    setSessionError(null);
    setLeadJourneyOptions([]);
    setPickerError(null);
    setLeadJourneysLoading(true);
    try {
      const res = await widgetAwareFetch(
        `/api/widget/lead-journeys?brand=${encodeURIComponent(brand)}`
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

  const openNewChatPickerRef = useRef(openNewChatPicker);
  openNewChatPickerRef.current = openNewChatPicker;

  useEffect(() => {
    if (
      !sessionsHydrated ||
      !effectiveUser ||
      !brand ||
      authLoading ||
      signingOut
    )
      return;
    void openNewChatPickerRef.current();
  }, [sessionsHydrated, effectiveUser, brand, authLoading, signingOut]);

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
      const response = await widgetAwareFetch("/api/lead-journey", {
        method: "POST",
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

  const handleWidgetSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      clearWidgetAuth();
      if (firebaseUser) {
        const res = await fetch("/api/logout", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setSessionError("Could not sign out. Try again.");
          await refresh();
          return;
        }
      }
      setSessionError(null);
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

  if (authLoading && !effectiveUser) {
    return (
      <WidgetChatLoader
        primaryHex={primaryHex}
        {...WIDGET_LOADER_MESSAGES.checkingSession}
      />
    );
  }

  if (!effectiveUser) {
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
            onClick={() => {
              setSignInError("");
              setPopupBlocked(false);
              const url = brandWidgetLoginUrl(brand);
              // Omit noopener so `window.opener` exists for postMessage back to this tab.
              const w = window.open(url, "_blank");
              if (!w) {
                setPopupBlocked(true);
                setSignInError(
                  "Could not open sign-in tab. Allow pop-ups or try again."
                );
                return;
              }
              try {
                w.focus();
              } catch {}
            }}
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

  const showFullBleedLoader =
    sessionsLoading ||
    (!servicePickerOpen && leadJourneysLoading) ||
    newChatLoading ||
    (Boolean(activeSessionId) && sessionLoading) ||
    (Boolean(activeSessionId) &&
      chatRole === LEAD_JOURNEY_ROLE &&
      logsLoading);

  if (showFullBleedLoader) {
    const { title, subtitle } = widgetLoaderMessagesFromFlags({
      sessionsLoading,
      servicePickerOpen,
      leadJourneysLoading,
      newChatLoading,
      activeSessionId,
      sessionLoading,
      chatRole,
      logsLoading,
      leadJourneyRole: LEAD_JOURNEY_ROLE,
    });
    return (
      <WidgetChatLoader primaryHex={primaryHex} title={title} subtitle={subtitle} />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="relative" ref={historyMenuRef}>
          <button
            type="button"
            id="widget-chat-history-trigger"
            aria-expanded={historyMenuOpen}
            aria-haspopup="listbox"
            aria-controls="widget-chat-history-listbox"
            disabled={sessionsLoading || sessions.length === 0}
            onClick={() => setHistoryMenuOpen((open) => !open)}
            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border/50 bg-background px-3 py-2 text-left text-xs text-foreground shadow-sm transition hover:bg-muted-bg/60 focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="min-w-0 truncate font-medium">Chat history</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${historyMenuOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {historyMenuOpen && sessions.length > 0 && (
            <div
              id="widget-chat-history-listbox"
              role="listbox"
              aria-labelledby="widget-chat-history-trigger"
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-border/50 bg-background py-1 text-xs shadow-lg ring-1 ring-border/40"
            >
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={activeSessionId === s.id}
                  onClick={() => selectSessionById(s.id)}
                  className={`flex w-full min-w-0 items-center px-3 py-2 text-left transition hover:bg-muted-bg ${
                    activeSessionId === s.id
                      ? "bg-muted-bg/80 font-medium text-foreground"
                      : "text-foreground"
                  }`}
                >
                  <span className="min-w-0 truncate">{widgetSessionTitle(s)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {sessions.length === 0 && !sessionsLoading && (
          <p className="text-[11px] text-muted">No widget chats yet</p>
        )}
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
                <div
                  className="flex flex-col items-center justify-center gap-3 py-10 text-center"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2
                    className="h-7 w-7 animate-spin text-muted-foreground"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
                    Loading conversation types you can start here.
                  </p>
                </div>
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
                    ? `ml-auto max-w-[min(100%,22rem)] min-w-0 rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white ${!userBubbleHex ? "bg-highlight shadow-md" : ""}`
                    : "mr-auto w-full max-w-full min-w-0 rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm text-foreground shadow-sm dark:bg-card/90"
                }
                style={
                  m.role === "user" && userBubbleHex
                    ? {
                        backgroundColor: userBubbleHex,
                        boxShadow: `0 4px 14px -3px ${hexToRgba(userBubbleHex, 0.42) || "rgba(0,0,0,0.12)"}, 0 0 0 1px ${hexToRgba(userBubbleHex, 0.18) || "transparent"}`,
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
                    {chatRole === LEAD_JOURNEY_ROLE && (
                      <AssistantReplyCopyButton
                        className="mt-2"
                        message={m.message}
                        sourceCards={m.sourceCards}
                        sourceUrls={m.sourceUrls}
                        readMoreUrl={readMoreCopyUrl}
                        brandSubdomain={brand}
                      />
                    )}
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