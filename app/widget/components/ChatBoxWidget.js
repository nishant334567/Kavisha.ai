"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { useFirebaseSession } from "@/app/lib/firebase/FirebaseSessionProvider";
import {
  clearWidgetAuth,
  getCurrentWidgetUser,
  subscribeWidgetSession,
  widgetAwareFetch,
} from "@/app/lib/widget-session";
import {
  detectInAppBrowser,
  isMobileDevice,
  openInChrome,
} from "@/app/lib/in-app-browser";
import FormatText from "@/app/components/FormatText";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import AssistantEngagementRow from "@/app/components/AssistantEngagementRow";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";
import LiveChat from "@/app/components/LiveChat";
import WidgetIntroTypewriter from "./WidgetIntroTypewriter";
import WidgetChatLoader, {
  WIDGET_LOADER_MESSAGES,
  widgetLoaderMessagesFromFlags,
} from "./WidgetChatLoader";
const LEAD_JOURNEY_ROLE = "lead_journey";

/** Apex `kavisha.ai` for main brand; `{brand}.kavisha.ai` for others; localhost unchanged — base for `/widget-login`. */
function brandWidgetLoginBase(brandSlug) {
  const s = String(brandSlug || "").trim().toLowerCase();
  if (!s || !/^[a-z0-9-]+$/i.test(s)) return null;
  if (typeof window === "undefined") return null;
  const { hostname, port, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const p = port ? `:${port}` : "";
    return `${protocol}//${hostname}${p}`;
  }
  if (s === "kavisha") {
    if (hostname.includes(".staging.")) return "https://kavisha.staging.kavisha.ai";
    return "https://kavisha.ai";
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
  if (s === "kavisha") {
    if (hostname.includes(".staging.")) return "https://kavisha.staging.kavisha.ai/community";
    return "https://kavisha.ai/community";
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
  adminMessagesEnabled = false,
  /** Notifies shell (e.g. Support button unread dot) when admin unread count changes. */
  onAdminUnreadCount,
  /** Friend Connect and/or Professional Connect — gates Community links (matches Navbar / MobileBottomNav). */
  communityEnabled = false,
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
  const messagesScrollRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
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
  const [introQuestionIndex, setIntroQuestionIndex] = useState(0);
  /** Horizontal swipe on suggested-question carousel (mobile); chevrons hidden below md. */
  const introCarouselTouchStartRef = useRef(null);

  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  /** Default true: avoid a first-paint flash of intro chevrons on phones before `isMobileDevice()` runs. */
  const [isMobile, setIsMobile] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const historyMenuRef = useRef(null);
  /** Admin → user DMs after `since` in sessionStorage (see fetchAdminUnread). */
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [brandInboxOpen, setBrandInboxOpen] = useState(false);
  const [brandInboxUserA, setBrandInboxUserA] = useState(null);
  const [brandInboxUserB, setBrandInboxUserB] = useState(null);
  const [brandInboxConnectionId, setBrandInboxConnectionId] = useState(null);
  const [brandInboxViewerId, setBrandInboxViewerId] = useState(null);
  const [brandInboxPeerName, setBrandInboxPeerName] = useState("");
  const [brandInboxLoading, setBrandInboxLoading] = useState(false);

  const onAdminUnreadCountRef = useRef(onAdminUnreadCount);
  onAdminUnreadCountRef.current = onAdminUnreadCount;
  useEffect(() => {
    onAdminUnreadCountRef.current?.(adminUnreadCount);
  }, [adminUnreadCount]);

  useEffect(() => {
    setIsInAppBrowser(detectInAppBrowser());
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    return subscribeWidgetSession((session) => {
      setWidgetUser(session?.user || null);
    });
  }, []);

  const handleIntroCarouselTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    introCarouselTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }, []);

  const handleIntroCarouselTouchEnd = useCallback(
    (e) => {
      const start = introCarouselTouchStartRef.current;
      introCarouselTouchStartRef.current = null;
      if (!start) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const count = introQuestions.length;
      if (count <= 1) return;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      setIntroQuestionIndex((idx) => {
        if (dx < 0) {
          return Math.min(count - 1, idx + 1);
        }
        return Math.max(0, idx - 1);
      });
    },
    [introQuestions.length]
  );

  const handleIntroCarouselTouchCancel = useCallback(() => {
    introCarouselTouchStartRef.current = null;
  }, []);

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

  const fetchAdminUnread = useCallback(async () => {
    const sid = effectiveUser?.id || effectiveUser?.uid;
    if (!adminMessagesEnabled || !sid || !brand) return;
    try {
      const key = `kavisha:widget:adminInboxSince:${brand}:${sid}`;
      let since = sessionStorage.getItem(key);
      if (!since) {
        since = new Date().toISOString();
        sessionStorage.setItem(key, since);
      }
      const res = await widgetAwareFetch(
        `/api/widget/brand-admin-unread?brand=${encodeURIComponent(brand)}&since=${encodeURIComponent(since)}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.unreadCount === "number") {
        setAdminUnreadCount(data.unreadCount);
      }
    } catch {
      /* ignore */
    }
  }, [adminMessagesEnabled, effectiveUser?.id, effectiveUser?.uid, brand]);

  useEffect(() => {
    const sid = effectiveUser?.id || effectiveUser?.uid;
    if (!adminMessagesEnabled || authLoading || !sid || !brand) return;
    void fetchAdminUnread();
    const t = setInterval(() => void fetchAdminUnread(), 45000);
    return () => clearInterval(t);
  }, [
    adminMessagesEnabled,
    authLoading,
    effectiveUser?.id,
    effectiveUser?.uid,
    brand,
    fetchAdminUnread,
  ]);

  useEffect(() => {
    if (adminMessagesEnabled) return;
    setBrandInboxOpen(false);
    setAdminUnreadCount(0);
  }, [adminMessagesEnabled]);

  const openBrandInbox = useCallback(async () => {
    const sid = effectiveUser?.id || effectiveUser?.uid;
    if (!adminMessagesEnabled || !sid || !brand) return;
    setBrandInboxLoading(true);
    try {
      const res = await widgetAwareFetch(
        `/api/widget/brand-admin-inbox-open?brand=${encodeURIComponent(brand)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Could not open messages"
        );
      }
      sessionStorage.setItem(
        `kavisha:widget:adminInboxSince:${brand}:${sid}`,
        new Date().toISOString()
      );
      setAdminUnreadCount(0);
      setBrandInboxUserA(String(data.userA));
      setBrandInboxUserB(String(data.userB));
      setBrandInboxConnectionId(String(data.connectionId));
      setBrandInboxViewerId(String(data.currentUserId));
      setBrandInboxPeerName(String(data.peerName || "Brand"));
      setBrandInboxOpen(true);
    } catch (e) {
      setSessionError(e?.message || "Could not open messages");
    } finally {
      setBrandInboxLoading(false);
    }
  }, [adminMessagesEnabled, effectiveUser?.id, effectiveUser?.uid, brand]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpenSupport = () => {
      void openBrandInbox();
    };
    window.addEventListener("kavisha:widget:openSupport", onOpenSupport);
    return () => {
      window.removeEventListener("kavisha:widget:openSupport", onOpenSupport);
    };
  }, [openBrandInbox]);

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
    setIntroQuestionIndex(0);
  }, [activeSessionId, introQuestions.length]);

  const updateStickyFromScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    shouldStickToBottomRef.current = distanceFromBottom < 120;
  }, []);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    const el = messagesScrollRef.current;
    if (!el) {
      // Fallback if ref isn't ready yet.
      endRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }
    // Instant "stick-to-bottom" avoids smooth-scroll-triggered viewport resize jitter.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
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
              liked: Boolean(row.liked),
              copied: Boolean(row.copied),
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

  const updateMessageEngagement = useCallback((logId, counts) => {
    const lid = String(logId || "");
    if (!lid) return;
    setMessages((prev) =>
      prev.map((msg) => {
        const mid = msg.id != null ? String(msg.id) : "";
        if (mid === lid) {
          return { ...msg, ...counts };
        }
        return msg;
      })
    );
  }, []);

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
    // If the user is sending a message, always jump to bottom (even if they had scrolled up).
    shouldStickToBottomRef.current = true;
    const el = messagesScrollRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
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

      const assistantMsg = {
        id: data?.assistantLogId ?? null,
        role: "assistant",
        message: data.reply ?? "",
        sourceUrls: data?.sourceUrls || [],
        sourceCards: data?.sourceCards || [],
        liked: false,
        copied: false,
      };
      setMessages([...withRequery, assistantMsg]);
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
              } catch { }
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
        {communityEnabled ? (
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
        ) : null}
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

  const introQuestionCount = introQuestions.length;
  const safeIntroQuestionIndex =
    introQuestionCount > 0
      ? Math.max(0, Math.min(introQuestionIndex, introQuestionCount - 1))
      : 0;
  const activeIntroQuestion =
    introQuestionCount > 0 ? introQuestions[safeIntroQuestionIndex] : "";
  const prevIntroQuestion =
    safeIntroQuestionIndex > 0
      ? introQuestions[safeIntroQuestionIndex - 1]
      : null;
  const nextIntroQuestion =
    safeIntroQuestionIndex < introQuestionCount - 1
      ? introQuestions[safeIntroQuestionIndex + 1]
      : null;

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
    <>
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
                    className={`flex w-full min-w-0 items-center px-3 py-2 text-left transition hover:bg-muted-bg ${activeSessionId === s.id
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
          <div className="-mx-1 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 scrollbar-thin">
            <div className="flex min-w-full flex-nowrap items-stretch justify-between gap-2 px-1 sm:gap-2.5 sm:px-2">
              <button
                type="button"
                onClick={openNewChatPicker}
                disabled={
                  newChatLoading ||
                  leadJourneysLoading ||
                  sessionsLoading ||
                  signingOut
                }
                className={`flex min-h-9 min-w-[6.75rem] shrink-0 flex-1 basis-0 flex-row items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition hover:opacity-92 disabled:opacity-50 sm:min-w-[7.25rem] sm:px-3 ${primaryHex
                  ? "border border-transparent text-white"
                  : "border border-border/50 bg-background text-foreground hover:bg-muted-bg"
                  }`}
                style={
                  primaryHex
                    ? {
                      backgroundColor: primaryHex,
                      boxShadow: `0 2px 10px ${hexToRgba(primaryHex, 0.3) || "rgba(0,0,0,0.1)"}`,
                    }
                    : undefined
                }
              >
                {newChatLoading || leadJourneysLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0" />
                )}
                <span className="whitespace-nowrap">New chat</span>
              </button>
              {communityEnabled ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(buildBrandCommunityUrl(brand), "_blank", "noopener,noreferrer")
                  }
                  className="flex min-h-9 min-w-[6.75rem] shrink-0 flex-1 basis-0 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm transition hover:bg-muted-bg sm:min-w-[7.25rem] sm:px-3"
                  title="Open community in a new tab"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">Community</span>
                </button>
              ) : null}
              {/* Support entry moved to top header in `app/widget/page.js` */}
              <button
                type="button"
                onClick={handleWidgetSignOut}
                disabled={signingOut}
                className="flex min-h-9 min-w-[6.75rem] shrink-0 flex-1 basis-0 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted shadow-sm transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50 sm:min-w-[7.25rem] sm:px-3"
                title="Sign out"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 shrink-0" />
                )}
                <span className="whitespace-nowrap">Sign out</span>
              </button>
            </div>
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
            <div
              ref={messagesScrollRef}
              onScroll={updateStickyFromScroll}
              onWheel={updateStickyFromScroll}
              onTouchMove={updateStickyFromScroll}
              className="scrollbar-thin min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden rounded-b-xl bg-muted-bg/20 p-3 dark:bg-muted-bg/10"
            >
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
                                    className={`max-w-full break-all rounded-md px-2 py-0.5 text-xs transition-colors hover:underline ${primaryHex
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
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <AssistantEngagementRow
                              logId={
                                m.id != null ? String(m.id) : ""
                              }
                              liked={Boolean(m.liked)}
                              onUpdated={(c) =>
                                updateMessageEngagement(
                                  m.id != null ? String(m.id) : "",
                                  c
                                )
                              }
                            />
                            <AssistantReplyCopyButton
                              message={m.message}
                              sourceCards={m.sourceCards}
                              sourceUrls={m.sourceUrls}
                              readMoreUrl={readMoreCopyUrl}
                              brandSubdomain={brand}
                              logId={
                                m.id != null ? String(m.id) : ""
                              }
                              copied={Boolean(m.copied)}
                              onRecorded={(c) =>
                                updateMessageEngagement(
                                  m.id != null ? String(m.id) : "",
                                  c
                                )
                              }
                            />
                          </div>
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
                <div className="shrink-0 px-1 py-1.5">
                  <p className="mb-2 px-1 text-xs font-medium tracking-wide text-muted">
                    Suggested questions
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="mx-auto flex w-full max-w-full items-center gap-2 sm:gap-2.5">
                      <div
                        className={`hidden shrink-0 items-center justify-center ${!isMobile ? "min-[360px]:flex min-[360px]:basis-[2.5%] min-[360px]:max-w-9" : ""}`}
                      >
                        {prevIntroQuestion ? (
                          <button
                            type="button"
                            aria-label="Previous suggested question"
                            onClick={() =>
                              setIntroQuestionIndex((idx) => Math.max(0, idx - 1))
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background text-foreground shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 hover:border-border hover:bg-muted-bg hover:text-foreground hover:shadow-md hover:ring-highlight/25 dark:border-border/55 dark:bg-card dark:ring-white/[0.06] dark:hover:ring-highlight/35"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </button>
                        ) : (
                          <div className="h-8 w-8 shrink-0" aria-hidden />
                        )}
                      </div>

                      <div
                        className={`relative z-10 min-h-12 min-w-0 flex-1 touch-pan-y overflow-hidden rounded-2xl border border-border/45 bg-background shadow-sm dark:border-border/40 ${!isMobile ? "min-[360px]:basis-[95%]" : ""}`}
                        onTouchStart={handleIntroCarouselTouchStart}
                        onTouchEnd={handleIntroCarouselTouchEnd}
                        onTouchCancel={handleIntroCarouselTouchCancel}
                      >
                        <div
                          className="grid grid-flow-col auto-cols-[100%] transition-transform duration-300 ease-out"
                          style={{
                            transform: `translateX(-${safeIntroQuestionIndex * 100}%)`,
                          }}
                        >
                          {introQuestions.map((q, i) => (
                            <button
                              key={`intro-question-${i}`}
                              type="button"
                              onClick={() => void sendUserMessage(q)}
                              disabled={sendLoading}
                              className="flex min-h-12 w-full items-start px-4 py-2.5 text-left text-sm font-medium leading-snug text-foreground transition-colors hover:bg-muted-bg disabled:opacity-50"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className={`hidden shrink-0 items-center justify-center ${!isMobile ? "min-[360px]:flex min-[360px]:basis-[2.5%] min-[360px]:max-w-9" : ""}`}
                      >
                        {nextIntroQuestion ? (
                          <button
                            type="button"
                            aria-label="Next suggested question"
                            onClick={() =>
                              setIntroQuestionIndex((idx) =>
                                Math.min(introQuestionCount - 1, idx + 1)
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background text-foreground shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 hover:border-border hover:bg-muted-bg hover:text-foreground hover:shadow-md hover:ring-highlight/25 dark:border-border/55 dark:bg-card dark:ring-white/[0.06] dark:hover:ring-highlight/35"
                          >
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </button>
                        ) : (
                          <div className="h-8 w-8 shrink-0" aria-hidden />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <div className="flex items-center gap-1.5">
                          {introQuestions.map((_, i) => (
                            <button
                              key={`intro-dot-${i}`}
                              type="button"
                              aria-label={`Go to suggested question ${i + 1}`}
                              onClick={() => setIntroQuestionIndex(i)}
                              className="h-2.5 w-2.5 rounded-full bg-[#d1d1d1] transition-colors hover:bg-[#bcbcbc]"
                            />
                          ))}
                        </div>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-0 top-0 h-2.5 w-6 rounded-full bg-[#9d9d9d] transition-transform duration-300 ease-out"
                          style={{ transform: `translateX(${safeIntroQuestionIndex * 16}px)` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <form
              onSubmit={handleSubmit}
              className="shrink-0 pt-1"
            >
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message…"
                  disabled={sendLoading}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 pr-11 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !input.trim()}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-75 disabled:opacity-35"
                  aria-label="Send"
                >
                  {sendLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </form>
            <p
              className={`mt-2 shrink-0 pb-0.5 text-center text-xs ${primaryHex ? "" : "text-muted"
                }`}
              style={primaryHex ? { color: primaryHex } : undefined}
            >
              Powered by{" "}
              <a
                href="https://kavisha.ai/widget-intro"
                target="_blank"
                rel="noopener noreferrer"
                className={`font-semibold underline-offset-2 hover:underline ${primaryHex ? "" : "text-highlight"
                  }`}
              >
                Kavisha
              </a>
            </p>
          </>
        )}
      </div>
      {adminMessagesEnabled &&
        brandInboxOpen &&
        brandInboxUserA &&
        brandInboxUserB &&
        brandInboxConnectionId &&
        brandInboxViewerId && (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-3">
            <div className="flex h-[min(88dvh,560px)] w-full max-h-[92dvh] max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
              <LiveChat
                userA={brandInboxUserA}
                userB={brandInboxUserB}
                currentUserId={brandInboxViewerId}
                connectionId={brandInboxConnectionId}
                onClose={() => setBrandInboxOpen(false)}
                isEmbedded={true}
                otherUserDisplayName={brandInboxPeerName}
                messagingBrand={brand}
                primaryColor={primaryColor}
                httpFetch={(url, init) => widgetAwareFetch(url, init ?? {})}
              />
            </div>
          </div>
        )}
    </>
  );
}