"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

import Resume from "./Resume";
import FormatText from "./FormatText";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import {
  Mic,
  MicOff,
  Send,
  Paperclip,
  ChevronDown,
} from "lucide-react";
import Matches from "@/app/components/Matches";
import {
  brandUserBubbleCssVars,
  normalizeBrandHex,
} from "@/app/lib/brandTheme";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import ProductCards, { partitionCitationCards } from "@/app/components/ProductCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import AssistantEngagementRow from "@/app/components/AssistantEngagementRow";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";
import LiveChat from "@/app/components/LiveChat";
import PoweredByKavisha from "@/app/components/PoweredByKavisha";
import { useCommunityConnect } from "@/app/hooks/useCommunityConnect";

function toGracefulHeaderLabel(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChatBox({
  currentChatId,
  // currentChatType,
  // updateChatId,
  // showInbox,
  // setShowInbox,
}) {
  const endOfMessagesRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const suggestionsRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const inputRef = useRef(null);
  const [suggestionsBelowFold, setSuggestionsBelowFold] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const brandContext = useBrandContext();
  const router = useRouter();
  const { user } = useFirebaseSession();
  const [matches, setMatches] = useState([]);
  const [matchesLastSyncedAt, setMatchesLastSyncedAt] = useState(null);
  const [matchesRefreshing, setMatchesRefreshing] = useState(false);
  const [resumeData, setResumedata] = useState({});
  const [hasDatacollected, setHasDatacollected] = useState();
  const [eligibleForMatches, setEligibleForMatches] = useState(false);
  const [retry, setRetry] = useState(false);
  const [retryIndex, setRetryIndex] = useState(undefined);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [liveChatOtherDisplayName, setLiveChatOtherDisplayName] =
    useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef(null);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcribeError, setTranscribeError] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const resizeComposerInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const minHeight = 36; /* matches h-9 button row */
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    resizeComposerInput();
  }, [input, resizeComposerInput]);

  const [chatLoading, setChatLoading] = useState(false);
  const [summaryUptilnow, setSummaryUptilnow] = useState("");
  const [currentChatType, setCurrentChatType] = useState(null);
  const [sessionName, setSessionName] = useState(null);
  const [serviceKey, setServiceKey] = useState(null);
  const [serviceType, setServiceType] = useState("chat");
  const [sessionMessageCount, setSessionMessageCount] = useState(0);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(true);
  const [isCommunitySession, setIsCommunitySession] = useState(false);
  const [isJobsRequirementPost, setIsJobsRequirementPost] = useState(false);
  const [onboardingPercent, setOnboardingPercent] = useState(0);

  // Fetch chat type from chat ID
  useEffect(() => {
    if (!currentChatId) {
      setCurrentChatType(null);
      setServiceKey(null);
      setServiceType("chat");
      setSessionMessageCount(0);
      setIsCommunitySession(false);
      setIsJobsRequirementPost(false);
      setOnboardingPercent(0);
      setSessionDetailsLoading(false);
      return;
    }

    setSessionDetailsLoading(true);
    const fetchChatType = async () => {
      try {
        const subdomain = brandContext?.subdomain;
        const brandQuery =
          subdomain && subdomain !== "kavisha"
            ? `?brand=${encodeURIComponent(subdomain)}`
            : "";
        const response = await fetch(`/api/session/${currentChatId}${brandQuery}`);
        if (response.status === 403) {
          router.replace("/chats");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setCurrentChatType(data.role || null);
          setSessionName(data.name || null);
          setServiceKey(data.serviceKey || null);
          setServiceType(data.serviceType || "chat");
          setSessionMessageCount(
            typeof data.messageCount === "number" ? data.messageCount : 0,
          );
          const community = Boolean(data.isCommunityChat);
          setIsCommunitySession(community);
          setIsJobsRequirementPost(Boolean(data.isJobsRequirementPost));
          const pct =
            typeof data.onboardingPercent === "number" &&
              !Number.isNaN(data.onboardingPercent)
              ? Math.max(0, Math.min(100, data.onboardingPercent))
              : 0;
          setOnboardingPercent(data.allDataCollected ? 100 : pct);
          setHasDatacollected(Boolean(data.allDataCollected));
          setEligibleForMatches(
            community && (Boolean(data.allDataCollected) || pct >= 40),
          );
        }
      } catch (error) {
        console.error("Error fetching chat type:", error);
      } finally {
        setSessionDetailsLoading(false);
      }
    };

    fetchChatType();
  }, [currentChatId, brandContext?.subdomain, router]);

  useEffect(() => {
    if (!isRecording) return;
    timerRef.current = 0;
    setSeconds(0);
    intervalRef.current = setInterval(() => {
      timerRef.current += 1;
      setSeconds((s) => {
        const next = s + 1;
        if (next >= 15) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRecording]);

  useEffect(() => {
    //fetch resume data initially - only for job_seeker, recruiter, or dating
    if (!currentChatId) return;
    const allowedTypes = ["job_seeker", "recruiter", "dating"];
    if (
      !currentChatType ||
      !allowedTypes.includes(currentChatType.toLowerCase())
    )
      return;

    const fetchResumeData = async () => {
      try {
        const response = await fetch(`/api/resume-data/${currentChatId}`);
        const data = await response.json();
        setResumedata({
          filename: data.resumeFilename,
          resumeSummary: data.resumeSummary,
        });
      } catch (error) { }
    };
    fetchResumeData();
  }, [currentChatId, currentChatType]);

  useEffect(() => {
    // Only fetch for job_seeker, recruiter, or dating
    if (!currentChatId) return;
    const allowedTypes = ["job_seeker", "recruiter", "dating"];
    if (
      !currentChatType ||
      !allowedTypes.includes(currentChatType.toLowerCase())
    )
      return;

    const fetchDataCollectionStatus = async () => {
      try {
        const response = await fetch(`/api/all-data-fetched/${currentChatId}`);
        const data = await response.json();
        if (typeof data?.allDataCollected === "boolean") {
          setHasDatacollected(data.allDataCollected);
        }
        if (typeof data?.eligibleForMatches === "boolean") {
          setEligibleForMatches(data.eligibleForMatches);
        } else if (typeof data?.onboardingPercent === "number") {
          const pct = Math.max(
            0,
            Math.min(100, Number(data.onboardingPercent) || 0)
          );
          setEligibleForMatches(Boolean(data?.allDataCollected) || pct >= 40);
        }
      } catch (error) { }
    };
    fetchDataCollectionStatus();
  }, [currentChatId, currentChatType]);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
  }, [currentChatId]);

  useEffect(() => {
    setMatches([]);
    setMatchesLastSyncedAt(null);
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId) {
      setMatches([]);
      return;
    }
    if (sessionDetailsLoading || eligibleForMatches !== true) {
      if (eligibleForMatches === false) {
        setMatches([]);
      }
      return;
    }

    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/fetch-matches/${currentChatId}`);
        const data = await response.json();

        if (typeof data?.allDataCollected === "boolean") {
          setHasDatacollected(data.allDataCollected);
        }
        if (typeof data?.eligibleForMatches === "boolean") {
          setEligibleForMatches(data.eligibleForMatches);
        } else if (typeof data?.onboardingPercent === "number") {
          const pct = Math.max(0, Math.min(100, Number(data.onboardingPercent) || 0));
          setEligibleForMatches(Boolean(data?.allDataCollected) || pct >= 40);
        }
        if (Array.isArray(data.matches)) {
          setMatches(data.matches);
        } else {
          setMatches([]);
        }
        if (data.allDataCollected) {
          setMatchesLastSyncedAt(Date.now());
        }
      } catch (error) {
        console.error(`[Matches] Error fetching matches:`, error);
        setMatches([]);
      }
    };

    fetchMatches();
  }, [currentChatId, eligibleForMatches, sessionDetailsLoading]);

  const suggestedQuestions = useMemo(() => {
    if (serviceType !== "chat" || messages.length > 1) return [];
    const service = brandContext?.services?.find((s) => s._key === serviceKey);
    return (service?.introquestions || []).slice(0, 5).filter(Boolean);
  }, [serviceType, messages.length, brandContext?.services, serviceKey]);

  const checkSuggestionsVisibility = useCallback(() => {
    const scrollEl = messagesScrollRef.current;
    const suggestionsEl = suggestionsRef.current;
    if (!scrollEl || !suggestionsEl || suggestedQuestions.length === 0) {
      setSuggestionsBelowFold(false);
      return;
    }
    const scrollRect = scrollEl.getBoundingClientRect();
    const suggestionsRect = suggestionsEl.getBoundingClientRect();
    setSuggestionsBelowFold(suggestionsRect.top > scrollRect.bottom - 12);
  }, [suggestedQuestions.length]);

  const scrollToSuggestions = useCallback(() => {
    suggestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const updateStickyFromScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    shouldStickToBottomRef.current = distanceFromBottom < 120;
    checkSuggestionsVisibility();
  }, [checkSuggestionsVisibility]);

  const openChatSession = useCallback((userA, userB, otherDisplayName = null) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setLiveChatOtherDisplayName(
      otherDisplayName != null && String(otherDisplayName).trim() !== ""
        ? String(otherDisplayName).trim()
        : null,
    );
    setOpenChat(true);
  }, []);

  const {
    paidConnectedUserIds,
    handleConnect,
    connectingToUserId,
    refetchPaidConnections,
  } = useCommunityConnect({
    user,
    brandSubdomain: brandContext?.subdomain ?? "",
    openChatSession,
  });

  const updateMessageEngagement = useCallback((logId, counts) => {
    const id = String(logId || "");
    if (!id) return;
    setMessages((prev) =>
      prev.map((msg) => {
        const mid = msg._id != null ? String(msg._id) : "";
        if (mid === id) {
          return { ...msg, ...counts };
        }
        return msg;
      })
    );
  }, []);

  const handleRefreshMatches = useCallback(async () => {
    if (!currentChatId || eligibleForMatches !== true) return;
    setMatchesRefreshing(true);
    try {
      const res = await fetch(`/api/matches/${currentChatId}/refresh`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[Matches refresh]", data?.error || res.status);
        return;
      }
      if (Array.isArray(data.matches)) {
        setMatches(data.matches);
      }
      const t = data.refreshedAt ? Date.parse(data.refreshedAt) : Date.now();
      if (!Number.isNaN(t)) {
        setMatchesLastSyncedAt(t);
      }
      if (typeof data.allDataCollected === "boolean") {
        setHasDatacollected(data.allDataCollected);
      }
      if (typeof data?.eligibleForMatches === "boolean") {
        setEligibleForMatches(data.eligibleForMatches);
      }
      await refetchPaidConnections();
    } catch (e) {
      console.error("[Matches refresh]", e);
    } finally {
      setMatchesRefreshing(false);
    }
  }, [currentChatId, eligibleForMatches, refetchPaidConnections]);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }
    const isWelcomeOnly =
      messages.length === 1 && messages[0]?.role === "assistant";
    if (isWelcomeOnly) {
      shouldStickToBottomRef.current = false;
      requestAnimationFrame(() => {
        el.scrollTop = 0;
        checkSuggestionsVisibility();
      });
      return;
    }
    if (!shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, messageLoading, checkSuggestionsVisibility]);

  useEffect(() => {
    const scrollEl = messagesScrollRef.current;
    if (!scrollEl || suggestedQuestions.length === 0) {
      setSuggestionsBelowFold(false);
      return undefined;
    }
    const runCheck = () => checkSuggestionsVisibility();
    const ro = new ResizeObserver(runCheck);
    ro.observe(scrollEl);
    const attachSuggestionsObserver = () => {
      if (suggestionsRef.current) ro.observe(suggestionsRef.current);
      runCheck();
    };
    attachSuggestionsObserver();
    const rafId = requestAnimationFrame(attachSuggestionsObserver);
    scrollEl.addEventListener("scroll", runCheck, { passive: true });
    window.addEventListener("resize", runCheck);
    return () => {
      cancelAnimationFrame(rafId);
      scrollEl.removeEventListener("scroll", runCheck);
      ro.disconnect();
      window.removeEventListener("resize", runCheck);
    };
  }, [messages, suggestedQuestions, checkSuggestionsVisibility]);

  const uploadAudio = async (audioBlob) => {
    setIsTranscribing(true);
    setTranscribeError("");
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    try {
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setTranscribeError(data?.message || "Transcription failed");
        return;
      }
      const text = typeof data?.text === "string" ? data.text : "";
      if (text.trim()) {
        setTranscriptText(text.trim());
      } else {
        setTranscribeError("No transcription text returned.");
      }
    } catch (e) {
      setTranscribeError("Failed to read transcription response.");
    } finally {
      setIsTranscribing(false);
    }
  };
  const startRecording = async () => {
    // reset previous artifacts for a fresh capture
    setAudioUrl(null);
    setTranscriptText("");
    setTranscribeError("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      uploadAudio(audioBlob);
    };
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!isRecording) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const formatMessage = (message) => {
    return message.split("*").join(" ");
  };
  const updateResume = (filename, summary) => {
    setResumedata({ filename: filename, resumeSummary: summary });
  };
  const onResumeUpload = (newResumeData) => {
    if (newResumeData) {
      let resumeSubText = "I have uploaded the document. Have a look at it";
      const resumeSent = async () => {
        const newUserMessage = {
          role: "user",
          message: resumeSubText,
        };
        const userText = resumeSubText;
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput("");
        setMessageLoading(true);
        const response = await fetch("/api/ai", {
          method: "POST",
          body: JSON.stringify({
            history: messages,
            userMessage: userText,
            sessionId: currentChatId,
            resume: newResumeData,
            type: currentChatType,
            userId: user?.id,
          }),
        });
        if (!response.ok) {
          setMessages([
            ...updatedMessages,
            {
              role: "assistant",
              message: `${brandContext?.brandName} failed to respond to that. Can you please try again?`,
            },
          ]);
          setMessageLoading(false);
          setRetry(true);
          setRetryIndex(updatedMessages.length - 1);
          return;
        }
        const data = await response.json();

        setMessages([
          ...updatedMessages,
          { role: "assistant", message: data.reply },
        ]);
        setMessageLoading(false);

        if (
          data?.matchesWithObjectIds?.length > 0 &&
          data?.allDataCollected === "true"
        ) {
          setMatches(data?.matchesWithObjectIds);
          setHasDatacollected(true);
          setMatchesLastSyncedAt(Date.now());
        } else if (data?.allDataCollected === "true") {
          setMatches([]);
          setHasDatacollected(true);
          setMatchesLastSyncedAt(Date.now());
        } else {
          setMatches([]);
          setHasDatacollected(false);
        }

        const pct = data?.onboardingProgress?.percent;
        if (
          (isCommunitySession || isJobsRequirementPost) &&
          typeof pct === "number" &&
          !Number.isNaN(pct)
        ) {
          setOnboardingPercent(Math.max(0, Math.min(100, pct)));
        }
      };
      resumeSent();
    }
  };

  const handleSubmit = async (voiceText = null, isRetry = false) => {
    let sessionId = currentChatId;
    let messageText, updatedMessages, historyToUse;

    if (isRetry) {
      // Retry logic: remove last error message and get the message to retry
      const lastErrorRemoved = messages.filter((item, index) => {
        return index !== messages.length - 1;
      });
      const resendMessage = lastErrorRemoved[retryIndex];
      messageText = resendMessage?.message;
      updatedMessages = lastErrorRemoved;
      historyToUse = lastErrorRemoved.slice(0, retryIndex);
    } else {
      // Normal submit logic
      messageText = (voiceText ?? input).trim();
      if (!messageText) return;

      setInput("");
      setTranscriptText("");
      setAudioUrl(null);
      const newUserMessage = {
        role: "user",
        message: messageText,
        requery: null,
      }; // Will be updated after API response
      updatedMessages = [...messages, newUserMessage];
      historyToUse = updatedMessages;
    }

    // User sent / retried — follow the thread to the bottom even if they had scrolled up.
    shouldStickToBottomRef.current = true;

    setMessages(updatedMessages);
    setMessageLoading(true);
    let response;

    if (
      serviceType === "collect-data" ||
      currentChatType === "collect_data"
    ) {
      response = await fetch("/api/collect-data", {
        method: "POST",
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText || "",
          sessionId,
        }),
      });
    } else if (currentChatType !== "lead_journey") {
      response = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText || "",
          sessionId,
          resume: resumeData?.resumeSummary || "",
          type: currentChatType,
          userId: user?.id,
        }),
      });
    } else {
      response = await fetch("/api/lead-journey", {
        method: "POST",
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText,
          sessionId,
          summary: summaryUptilnow,
        }),
      });
    }

    if (!response.ok) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          message:
            "Kavisha failed to respond to that. Can you please try again?",
        },
      ]);
      setRetry(true);
      setRetryIndex(updatedMessages.length - 1);
      setMessageLoading(false);

      return;
    }
    const data = await response.json();
    setSummaryUptilnow(data?.summary);

    // Update the last user message with requery if available
    const updatedMessagesWithRequery = updatedMessages.map((msg, idx) => {
      if (idx === updatedMessages.length - 1 && msg.role === "user") {
        return { ...msg, requery: data?.requery || null };
      }
      return msg;
    });

    const assistantMsg = {
      role: "assistant",
      message: data.reply,
      sourceUrls: data?.sourceUrls || [],
      sourceCards: data?.sourceCards || [],
      productCards: data?.productCards || [],
      intent: data?.intent || "",
    };
    if (
      currentChatType?.toLowerCase() === "lead_journey" &&
      data?.assistantLogId
    ) {
      assistantMsg._id = data.assistantLogId;
      assistantMsg.liked = false;
      assistantMsg.copied = false;
    }
    setMessages([...updatedMessagesWithRequery, assistantMsg]);
    setMessageLoading(false);
    // Reset retry state on success
    if (isRetry) {
      setRetry(false);
      setRetryIndex(undefined);
    }

    if (data?.allDataCollected === "true") {
      setHasDatacollected(true);
    } else if (data?.allDataCollected === "false") {
      setHasDatacollected(false);
    }

    if (isCommunitySession) {
      if (
        data?.matchesWithObjectIds?.length > 0 &&
        data?.allDataCollected === "true"
      ) {
        setMatches(data?.matchesWithObjectIds);
        setMatchesLastSyncedAt(Date.now());
      } else if (data?.allDataCollected === "true") {
        setMatches([]);
        setMatchesLastSyncedAt(Date.now());
      }
    }

    if (
      currentChatType !== "lead_journey" &&
      (serviceType === "collect-data" ||
        currentChatType === "collect_data" ||
        isCommunitySession ||
        isJobsRequirementPost)
    ) {
      const pct = data?.onboardingProgress?.percent;
      if (typeof pct === "number" && !Number.isNaN(pct)) {
        setOnboardingPercent(Math.max(0, Math.min(100, pct)));
      }
    }
  };
  useEffect(() => {
    if (!currentChatId || !brandContext) {
      return;
    }
    setMessages([]);
    setChatLoading(true);
    const fetchChat = async () => {
      const subdomain = brandContext.subdomain;
      const brandQuery =
        subdomain && subdomain !== "kavisha"
          ? `?brand=${encodeURIComponent(subdomain)}`
          : "";
      const response = await fetch(`/api/logs/${currentChatId}${brandQuery}`);
      if (response.status === 403) {
        router.replace("/chats");
        setChatLoading(false);
        return;
      }
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
      setChatLoading(false);
    };

    fetchChat();
  }, [currentChatId, brandContext, router]);

  const primaryBrandHex = normalizeBrandHex(brandContext?.primaryBrandColor);
  const secondaryBrandHex = normalizeBrandHex(
    brandContext?.secondaryBrandColor,
  );
  const brandBubbleVars = useMemo(
    () => brandUserBubbleCssVars(primaryBrandHex),
    [primaryBrandHex],
  );

  if (chatLoading) {
    return (
      <div className="h-full mx-auto flex w-full items-center justify-center rounded-xl bg-background p-4 lg:w-3/5">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-6 w-6 rounded-full border-2 border-border"></div>
            <div
              className={`absolute inset-0 h-6 w-6 animate-spin rounded-full border-2 border-transparent ${!primaryBrandHex ? "border-t-[#59646F]" : ""
                }`}
              style={
                primaryBrandHex
                  ? { borderTopColor: primaryBrandHex }
                  : undefined
              }
            ></div>
          </div>
          <div className="text-xs font-medium text-muted">Loading chat…</div>
        </div>
      </div>
    );
  }

  if (sessionDetailsLoading) {
    return (
      <div className="kavisha-chat font-baloo flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-6 w-6 rounded-full border-2 border-[var(--kc-line)]" />
            <div className="absolute inset-0 h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-[var(--kc-ink)]" />
          </div>
          <p className="text-xs font-medium text-[var(--kc-ink-muted)]">
            Preparing your conversation…
          </p>
        </div>
      </div>
    );
  }

  const displayOnboardingPct = hasDatacollected ? 100 : onboardingPercent;

  const showOnboardingProgress =
    (serviceType === "collect-data" ||
      currentChatType === "collect_data" ||
      isCommunitySession ||
      isJobsRequirementPost) &&
    currentChatType?.toLowerCase() !== "lead_journey";

  const isCommunityRoleType = [
    "job_seeker",
    "recruiter",
    "friends",
  ].includes(String(currentChatType || "").toLowerCase());

  const communitySecondBadgeLabel = (() => {
    if (!isCommunityRoleType) return "";
    const communityTitles = {
      job_seeker: "Looking for work",
      recruiter: "Looking at hiring",
      friends: "Looking for a friend",
    };
    return (
      communityTitles[String(currentChatType || "").toLowerCase()] ||
      toGracefulHeaderLabel(currentChatType || "")
    );
  })();

  const sessionTitle =
    toGracefulHeaderLabel(
      isCommunityRoleType
        ? communitySecondBadgeLabel
        : sessionName || currentChatType?.split("_").join(" ") || "",
    ) || toGracefulHeaderLabel(brandContext?.brandName || "");

  return (
    <>
      <div
        className="kavisha-chat font-baloo mx-auto flex h-full min-h-0 w-full max-w-full flex-1 overflow-hidden md:max-w-2xl lg:max-w-3xl"
        style={brandBubbleVars || undefined}
      >
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1">
            <div
              ref={messagesScrollRef}
              onScroll={updateStickyFromScroll}
              onWheel={updateStickyFromScroll}
              onTouchMove={updateStickyFromScroll}
              className="chat-stage-scroll absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-none px-3 pb-4 pt-14 sm:px-4 sm:pt-20"
            >
              {/* <div className="flex flex-col gap-2 min-h-full justify-end"> */}
              {currentChatId &&
                messages.length > 0 &&
                messages.map((m, i) => (
                  <div
                    key={m._id != null ? String(m._id) : `msg-${i}`}
                    className={`chat-message-enter mb-5 w-full min-w-0 ${m.role === "user"
                      ? "flex flex-col items-end"
                      : "flex flex-col items-start"
                      }`}
                    style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                  >
                    {i === retryIndex && retry && (
                      <button
                        onClick={() => handleSubmit(null, true)}
                        className="mb-1.5 text-xs text-red-600 underline decoration-red-600/40 underline-offset-2 dark:text-red-400 dark:decoration-red-400/40"
                      >
                        Retry
                      </button>
                    )}
                    {m.role === "user" ? (
                      <div className="flex w-full min-w-0 justify-end">
                        <div className="chat-bubble-user max-w-[min(100%,22rem)] px-4 py-3 text-[0.9375rem] font-normal leading-[1.65] tracking-[0.01em] sm:max-w-[75%]">
                          {m.message}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full min-w-0">
                        <div className="chat-bubble-assistant w-full px-4 py-3.5 text-[0.9375rem] font-normal leading-[1.7] tracking-[0.01em]">
                          <div className="chat-prose">
                            <FormatText text={m.message} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show requery for user messages */}
                    {/* {m.role === "user" && m.requery && (
                    <div className="mt-1.5 max-w-[90%] sm:max-w-[60%] min-w-0">
                      <p className="text-xs text-muted italic break-words">
                        🔍 {m.requery}
                      </p>
                    </div>
                  )} */}
                    {/* Show sources for assistant messages */}
                    {m.role === "assistant" &&
                      (m.sourceCards?.length > 0 ||
                        m.productCards?.length > 0 ||
                        m.sourceUrls?.length > 0) && (
                        <div className="mt-1.5 w-full min-w-0">
                          {(() => {
                            const { sourceCards, productCards } =
                              partitionCitationCards(
                                m.sourceCards,
                                m.productCards
                              );
                            return (
                              <>
                                {productCards.length > 0 ? (
                                  <ProductCards
                                    items={productCards}
                                    brand={brandContext?.subdomain || ""}
                                    primaryHex={primaryBrandHex}
                                  />
                                ) : null}
                                {sourceCards.length > 0 ? (
                                  <AssistantSourceCards
                                    items={sourceCards}
                                    primaryHex={primaryBrandHex}
                                  />
                                ) : null}
                              </>
                            );
                          })()}
                          {!m.sourceCards?.length &&
                            !m.productCards?.length &&
                            m.sourceUrls?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted">
                                📚 Links:
                              </span>
                              {m.sourceUrls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 hover:underline dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60 dark:hover:text-blue-200"
                                >
                                  {url.length > 30
                                    ? `${url.slice(0, 30)}...`
                                    : url}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    {m.role === "assistant" &&
                      currentChatType?.toLowerCase() === "lead_journey" && (
                        <div className="mt-2 flex w-full min-w-0 flex-nowrap items-center gap-0.5">
                          <AssistantEngagementRow
                            logId={
                              m._id != null ? String(m._id) : ""
                            }
                            liked={Boolean(m.liked)}
                            onUpdated={(c) =>
                              updateMessageEngagement(
                                m._id != null ? String(m._id) : "",
                                c
                              )
                            }
                          />
                          <AssistantReplyCopyButton
                            message={m.message}
                            sourceCards={(() => {
                              const p = partitionCitationCards(
                                m.sourceCards,
                                m.productCards
                              );
                              return [...p.productCards, ...p.sourceCards];
                            })()}
                            sourceUrls={m.sourceUrls}
                            readMoreUrl={brandContext?.assistantCopyReadMoreUrl}
                            brandSubdomain={brandContext?.subdomain}
                            logId={
                              m._id != null ? String(m._id) : ""
                            }
                            copied={Boolean(m.copied)}
                            onRecorded={(c) =>
                              updateMessageEngagement(
                                m._id != null ? String(m._id) : "",
                                c
                              )
                            }
                          />
                        </div>
                      )}
                    {/* Show payment QR code for personal_call intent */}
                    {m.role === "assistant" &&
                      m.intent === "personal_call" &&
                      brandContext?.acceptPayment &&
                      brandContext?.paymentQrUrl && (
                        <div className="mt-3 max-w-[90%] sm:max-w-[60%] min-w-0">
                          <img
                            src={brandContext.paymentQrUrl}
                            alt="Payment QR Code"
                            className="w-48 h-48 object-contain border border-border rounded-lg shadow-sm bg-card p-2"
                          />
                        </div>
                      )}
                  </div>
                ))}
              {messageLoading && (
                <div className="chat-message-enter mb-5 flex w-full flex-col items-start">
                  <ChatThinkingRow primaryColor={primaryBrandHex} />
                </div>
              )}

              {eligibleForMatches && isCommunitySession && (
                <Matches
                  currentChatId={currentChatId}
                  matches={matches}
                  handleConnect={handleConnect}
                  paidConnectedUserIds={paidConnectedUserIds}
                  onRefresh={handleRefreshMatches}
                  lastSyncedAt={matchesLastSyncedAt}
                  refreshing={matchesRefreshing}
                />
              )}

              {suggestedQuestions.length > 0 && (
                <div ref={suggestionsRef} className="chat-suggestions-stack mb-2">
                  <p className="chat-suggestions-label">Suggested</p>
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSubmit(String(q).trim())}
                      disabled={messageLoading}
                      className="chat-suggestion-chip group"
                    >
                        <span className="text-left">{q}</span>
                    </button>
                  ))}
                </div>
              )}

              <div ref={endOfMessagesRef} />
            </div>

            {suggestionsBelowFold && (
              <div className="chat-suggestions-nudge-wrap pointer-events-none absolute inset-x-0 bottom-0 z-[15] flex justify-center px-3 pb-2 sm:px-4">
                <button
                  type="button"
                  onClick={scrollToSuggestions}
                  className="chat-suggestions-nudge pointer-events-auto"
                  aria-label="Scroll to suggested questions"
                >
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                  <span>Suggested questions</span>
                </button>
              </div>
            )}

            {(sessionTitle || brandContext?.logoUrl) && (
              <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center px-4 pt-2.5 sm:pt-3">
                <div className="chat-crown pointer-events-auto inline-flex max-w-[min(100%,24rem)] items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3">
                  {brandContext?.logoUrl ? (
                    <img
                      src={brandContext.logoUrl}
                      alt=""
                      className="chat-crown-avatar size-8 shrink-0 rounded-full object-cover sm:size-9"
                    />
                  ) : null}
                  {sessionTitle ? (
                    <p className="min-w-0 truncate pr-0.5 text-sm font-semibold leading-none tracking-[0.01em] text-[var(--kc-ink)] sm:text-[0.9375rem]">
                      {sessionTitle}
                    </p>
                  ) : null}
                </div>

                {showOnboardingProgress && (
                  <div
                    className="chat-progress-pill pointer-events-auto mt-2.5 inline-flex items-baseline gap-1 rounded-full px-3 py-1 text-xs tabular-nums"
                  >
                    <span className="font-semibold text-[var(--kc-ink)]">
                      {Math.round(
                        Math.min(100, Math.max(0, displayOnboardingPct)),
                      )}
                      %
                    </span>
                    <span className="text-[var(--kc-ink-muted)]">completed</span>
                  </div>
                )}
              </header>
            )}
          </div>

          <div className="chat-composer-dock relative mx-auto w-full max-w-3xl shrink-0 px-3 pt-0.5 sm:px-4">
            <div className="chat-composer-stack">
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div className="chat-composer-shell flex items-center gap-1 rounded-3xl py-1.5 pl-1 pr-1 transition-[border-color]">
                  <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-end rounded-full text-[var(--kc-ink-muted)] transition-colors hover:bg-[var(--kc-parchment)] hover:text-[var(--kc-ink)]">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                    />
                    <span
                      title={
                        resumeData?.filename
                          ? "Reselect"
                          : brandContext?.isBrandAdmin
                            ? "Share JD"
                            : "Upload Resume"
                      }
                    >
                      <Paperclip className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    </span>
                  </label>

                  <textarea
                    ref={inputRef}
                    rows={1}
                    className="chat-composer-input min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-6 text-[var(--kc-ink)] placeholder:text-[var(--kc-ink-muted)] focus:outline-none focus:ring-0 disabled:opacity-50"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      requestAnimationFrame(resizeComposerInput);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={`Message ${brandContext?.brandName || "…"}`}
                    disabled={messageLoading || isRecording || isTranscribing}
                  />

                  <div className="relative flex shrink-0 items-center gap-0.5 self-end">
                    {isTranscribing && (
                      <div className="absolute bottom-full right-0 z-20 mb-2">
                        <div className="chat-popover rounded-xl px-3 py-1.5 text-xs shadow-lg">
                          Transcribing…
                        </div>
                      </div>
                    )}
                    {transcribeError && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 max-w-[min(80vw,20rem)]">
                        <div className="chat-popover rounded-xl border-red-500/30 px-3 py-1.5 text-xs text-red-700 shadow-lg dark:text-red-400">
                          {transcribeError}
                        </div>
                      </div>
                    )}
                    {transcriptText && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 w-[min(80vw,28rem)]">
                        <div className="chat-popover rounded-xl p-3 shadow-lg">
                          <div className="mb-1 text-xs text-[var(--kc-ink-muted)]">
                            Voice transcript
                          </div>
                          <div className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm text-[var(--kc-ink)]">
                            {transcriptText}
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              onClick={() => handleSubmit(transcriptText)}
                              className="chat-send-btn rounded-full px-3 py-1.5 text-xs font-medium"
                              type="button"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => setTranscriptText("")}
                              className="rounded-full border border-[var(--kc-line)] px-3 py-1.5 text-xs text-[var(--kc-ink-muted)] hover:bg-[var(--kc-parchment)]"
                              type="button"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        isRecording ? stopRecording() : startRecording()
                      }
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isRecording
                        ? "bg-red-50 text-red-600"
                        : "text-[var(--kc-ink-muted)] hover:bg-[var(--kc-parchment)] hover:text-[var(--kc-ink)]"
                        }`}
                      title={isRecording ? "Stop recording" : "Start recording"}
                    >
                      {isRecording ? (
                        <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      ) : (
                        <MicOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      )}
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || messageLoading}
                      className="chat-send-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </div>
              </form>

              <PoweredByKavisha compact />
            </div>

            <Resume
              resumeData={resumeData}
              updateResume={updateResume}
              currentChatId={currentChatId}
              onResumeUpload={onResumeUpload}
              hideFileInput={true}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
            />
          </div>
        </div>
      </div>
      {connectingToUserId && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-6 shadow-xl">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-4 border-border" />
              <div
                className={`absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-transparent ${!primaryBrandHex ? "border-t-highlight" : ""
                  }`}
                style={
                  primaryBrandHex
                    ? { borderTopColor: primaryBrandHex }
                    : undefined
                }
              />
            </div>
            <span
              className={`text-sm font-medium ${!primaryBrandHex ? "text-highlight" : ""}`}
              style={primaryBrandHex ? { color: primaryBrandHex } : undefined}
            >
              Connecting...
            </span>
          </div>
        </div>
      )}
      {openChat && userA && userB && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-3">
          <div className="flex h-[min(88dvh,560px)] w-full max-h-[92dvh] max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
            <LiveChat
              userA={userA}
              userB={userB}
              currentUserId={user?.id}
              onClose={() => {
                setOpenChat(false);
                setLiveChatOtherDisplayName(null);
              }}
              connectionId={connectionId}
              isEmbedded={true}
              otherUserDisplayName={liveChatOtherDisplayName}
            />
          </div>
        </div>
      )}
    </>
  );
}
