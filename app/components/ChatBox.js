"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

import Resume from "./Resume";
import FormatText from "./FormatText";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { Send, Paperclip } from "lucide-react";
import SuggestedQuestionsCarousel from "@/app/components/SuggestedQuestionsCarousel";
import {
  getServiceIntroQuestions,
  isIntroChatWithSuggestions,
  shouldShowIntroSuggestedQuestions,
} from "@/app/lib/suggestedQuestions";
import Matches from "@/app/components/Matches";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import ProductCards, { partitionCitationCards } from "@/app/components/ProductCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import AssistantEngagementRow from "@/app/components/AssistantEngagementRow";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";
import LiveChat from "@/app/components/LiveChat";
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
  const shouldStickToBottomRef = useRef(true);
  const introScrollHandledRef = useRef(false);
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
    introScrollHandledRef.current = false;
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

  const updateStickyFromScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    shouldStickToBottomRef.current = distanceFromBottom < 120;
  }, []);

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
  const showIntroSuggestedQuestions = useMemo(
    () =>
      shouldShowIntroSuggestedQuestions({
        chatType: currentChatType,
        messages,
        messageLoading,
      }),
    [currentChatType, messages, messageLoading],
  );

  const introSuggestedQuestions = useMemo(
    () =>
      showIntroSuggestedQuestions
        ? getServiceIntroQuestions(brandContext, serviceKey)
        : [],
    [showIntroSuggestedQuestions, brandContext, serviceKey],
  );

  useEffect(() => {
    const el = messagesScrollRef.current;
    const isIntroWithSuggestions = isIntroChatWithSuggestions({
      chatType: currentChatType,
      messages,
      messageLoading,
    });

    if (isIntroWithSuggestions) {
      if (!introScrollHandledRef.current) {
        introScrollHandledRef.current = true;
        shouldStickToBottomRef.current = false;
        requestAnimationFrame(() => {
          if (el) el.scrollTop = 0;
        });
      }
      return;
    }
    introScrollHandledRef.current = false;

    if (!shouldStickToBottomRef.current) return;
    if (!el) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, messageLoading, currentChatType]);

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
    const sessionId = currentChatId;
    let messageText;
    let updatedMessages;
    let historyToUse;

    if (isRetry) {
      const lastErrorRemoved = messages.filter((item, index) => {
        return index !== messages.length - 1;
      });
      const resendMessage = lastErrorRemoved[retryIndex];
      messageText = resendMessage?.message;
      updatedMessages = lastErrorRemoved;
      historyToUse = lastErrorRemoved.slice(0, retryIndex);
    } else {
      messageText = (voiceText ?? input).trim();
      if (!messageText) return;

      setInput("");
      const newUserMessage = {
        role: "user",
        message: messageText,
        requery: null,
      };
      updatedMessages = [...messages, newUserMessage];
      historyToUse = updatedMessages;
    }

    shouldStickToBottomRef.current = true;
    setMessages(updatedMessages);
    setMessageLoading(true);

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
        { role: "assistant", message: assistantMessage },
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

    try {
      const fetchOpts = {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      };

      const isLeadJourney =
        String(currentChatType || "").toLowerCase() === "lead_journey";

      const response = isLeadJourney
        ? await fetch("/api/lead-journey", {
          ...fetchOpts,
          body: JSON.stringify({
            history: historyToUse,
            userMessage: messageText,
            sessionId,
            summary: summaryUptilnow,
          }),
        })
        : await fetch("/api/ai", {
          ...fetchOpts,
          body: JSON.stringify({
            history: historyToUse,
            userMessage: messageText || "",
            sessionId,
            resume: resumeData?.resumeSummary || "",
            type: currentChatType,
            userId: user?.id,
          }),
        });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const apiMsg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : null;
        failResponse(
          apiMsg ||
          `${brandContext?.brandName || "Kavisha"} failed to respond to that. Can you please try again?`
        );
        return;
      }

      if (data?.summary != null) setSummaryUptilnow(data.summary);

      const updatedMessagesWithRequery = updatedMessages.map((msg, idx) => {
        if (idx === updatedMessages.length - 1 && msg.role === "user") {
          return { ...msg, requery: data?.requery || null };
        }
        return msg;
      });

      const replyText =
        typeof data?.reply === "string" ? data.reply.trim() : "";
      if (!replyText) {
        failResponse(
          `${brandContext?.brandName || "Kavisha"} returned an empty reply. Please try again.`
        );
        return;
      }

      const assistantMsg = {
        role: "assistant",
        message: replyText,
        sourceUrls: data?.sourceUrls || [],
        sourceCards: data?.sourceCards || [],
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
      setRetry(false);
      setRetryIndex(undefined);

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

      if (
        !isLeadJourney &&
        (isCommunitySession || isJobsRequirementPost)
      ) {
        const pct = data?.onboardingProgress?.percent;
        if (typeof pct === "number" && !Number.isNaN(pct)) {
          setOnboardingPercent(Math.max(0, Math.min(100, pct)));
        }
      }
    } catch (err) {
      console.error("[ChatBox] handleSubmit:", err);
      failResponse(
        `${brandContext?.brandName || "Kavisha"} failed to respond to that. Can you please try again?`
      );
    } finally {
      setMessageLoading(false);
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
          <div className="text-xs font-medium text-muted">
            Fetching session details…
          </div>
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
      communityTitles[String(currentChatType || "").toLowerCase()]?.toUpperCase() ||
      String(currentChatType || "")
        .split("_")
        .join(" ")
        .toUpperCase() ||
      ""
    );
  })();

  const secondHeaderRaw = isCommunityRoleType
    ? communitySecondBadgeLabel
    : sessionName ||
    currentChatType?.split("_").join(" ") ||
    "";
  const secondHeaderDisplay = toGracefulHeaderLabel(secondHeaderRaw);

  return (
    <>
      <div className="font-baloo mx-auto flex h-full min-h-0 w-full max-w-full flex-1 overflow-hidden rounded-xl bg-background p-0 md:w-3/5 md:px-1">
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl font-light">
            {/* Logo + session context */}
            <div className="flex shrink-0 flex-row items-center justify-center gap-2.5 px-2 pb-3 pt-4 md:gap-3 md:pb-4 md:pt-5">
              <img
                src={brandContext?.logoUrl}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-1 ring-border/40 md:h-14 md:w-14"
              />
              {secondHeaderDisplay ? (
                <p className="min-w-0 max-w-[min(100%,14rem)] text-left font-baloo text-sm font-medium leading-tight text-foreground sm:max-w-xs md:max-w-sm md:text-[0.9375rem]">
                  {secondHeaderDisplay}
                </p>
              ) : null}
            </div>

            {showOnboardingProgress && (
              <div className="mb-1 flex w-full shrink-0 justify-start px-2 md:mb-1.5">
                <div
                  className="inline-flex items-baseline gap-0.5 rounded-md border border-border/45 bg-muted/35 px-2.5 py-1 text-[13px] italic tabular-nums shadow-sm backdrop-blur-[2px] dark:border-border/35 dark:bg-muted/25"
                  style={
                    primaryBrandHex
                      ? {
                        borderLeftWidth: 3,
                        borderLeftColor: primaryBrandHex,
                      }
                      : undefined
                  }
                >
                  <span className="font-semibold not-italic tracking-tight text-foreground">
                    {Math.round(
                      Math.min(100, Math.max(0, displayOnboardingPct))
                    )}
                    %
                  </span>
                  <span className="text-muted-foreground">completed</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesScrollRef}
              onScroll={updateStickyFromScroll}
              onWheel={updateStickyFromScroll}
              onTouchMove={updateStickyFromScroll}
              className="min-h-0 flex-1 overflow-y-scroll overflow-x-hidden scrollbar-none pt-2 md:pt-3"
            >
              {/* <div className="flex flex-col gap-2 min-h-full justify-end"> */}
              {currentChatId &&
                messages.length > 0 &&
                messages.map((m, i) => (
                  <div
                    key={m._id != null ? String(m._id) : `msg-${i}`}
                    className={`mb-4 w-full min-w-0 ${m.role === "user"
                      ? "flex flex-col items-end"
                      : "flex flex-col items-start"
                      }`}
                  >
                    {i === retryIndex && retry && (
                      <button
                        onClick={() => handleSubmit(null, true)}
                        className="text-xs text-red-500 hover:text-red-700 underline mb-1"
                      >
                        Retry
                      </button>
                    )}
                    {m.role === "user" ? (
                      <div className="flex justify-end w-full min-w-0">
                        <div
                          className="text-sm text-white font-normal font-baloo leading-relaxed break-words rounded-2xl px-3 py-2 md:px-4 max-w-[90%] sm:max-w-[60%]"
                          style={{
                            backgroundColor:
                              primaryBrandHex || "#004A4E",
                          }}
                        >
                          {m.message}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 md:gap-2 items-end w-full min-w-0">
                        <div className="flex flex-col justify-end flex-shrink-0">
                          <img
                            src={brandContext?.logoUrl}
                            className="rounded-full w-[32px] h-[32px] md:w-[40px] md:h-[40px] min-w-[32px] min-h-[32px] md:min-w-[40px] md:min-h-[40px] object-cover shadow-sm flex-shrink-0"
                          />
                        </div>
                        <div className="text-sm font-normal font-baloo leading-relaxed break-words rounded-2xl px-3 py-2 md:px-4 max-w-[90%] sm:max-w-[60%] bg-muted-bg min-w-0">
                          <FormatText text={m.message} />
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
                                  className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 hover:underline"
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
                        <div className="mt-1.5 flex w-full min-w-0 max-w-[90%] flex-nowrap items-center gap-0.5 sm:max-w-[60%]">
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
                <ChatThinkingRow
                  className="mb-4"
                  displayName={brandContext?.brandName}
                  primaryColor={brandContext?.primaryBrandColor}
                />
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
              {showIntroSuggestedQuestions &&
                introSuggestedQuestions.length > 0 && (
                  <SuggestedQuestionsCarousel
                    className="mb-2 mt-1 px-1 md:px-0"
                    accentColor={primaryBrandHex}
                    questions={introSuggestedQuestions}
                    disabled={messageLoading}
                    onSelect={(q) => handleSubmit(String(q).trim())}
                  />
                )}
              <div ref={endOfMessagesRef}></div>
            </div>
            {/* Suggested intro questions — chat services only */}
            {serviceType === "chat" &&
              messages.length <= 1 &&
              (() => {
                const service = brandContext?.services?.find(
                  (s) => s._key === serviceKey,
                );
                const questions = (service?.introquestions || [])
                  .slice(0, 5)
                  .filter(Boolean);
                if (questions.length === 0) return null;
                const scrollStep = 240;
                const scrollLeft = () =>
                  suggestedQuestionsScrollRef.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
                const scrollRight = () =>
                  suggestedQuestionsScrollRef.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
                return (
                  <div className="flex items-center gap-1 py-2">
                    <button
                      type="button"
                      onClick={scrollLeft}
                      aria-label="Scroll suggested questions left"
                      className="hidden md:flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-full border border-border bg-muted-bg hover:bg-border/30 text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div
                      ref={suggestedQuestionsScrollRef}
                      className="flex overflow-x-auto gap-2 flex-1 min-w-0 flex-nowrap overflow-y-hidden scrollbar-thin scroll-smooth"
                    >
                      {questions.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSubmit(String(q).trim())}
                          className="text-left px-3 py-2 rounded-xl border border-border bg-muted-bg hover:bg-border/30 text-foreground text-xs transition-colors flex-shrink-0 min-w-0 max-w-[85vw] md:max-w-[320px] whitespace-normal"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={scrollRight}
                      aria-label="Scroll suggested questions right"
                      className="hidden md:flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-full border border-border bg-muted-bg hover:bg-border/30 text-foreground transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                );
              })()}
            {/* Textarea Section - flex-1 */}
            <div className="flex-1 min-h-0 flex flex-col border-border pt-2">
              <form
                className="w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div
                  className="relative flex w-full items-end gap-0.5 rounded-full border border-border/50 bg-background py-1.5 pl-1.5 pr-2 shadow-md shadow-black/[0.06] ring-1 ring-black/[0.04] transition-[box-shadow,ring-color] focus-within:border-border focus-within:shadow-lg focus-within:ring-2 focus-within:ring-ring/40 dark:border-border/55 dark:bg-card dark:shadow-black/25 dark:ring-white/[0.06]"
                >
                  <label className="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-muted transition-colors hover:bg-muted-bg/80 hover:text-foreground">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                    />
                    <span
                      className="transition-transform hover:scale-105"
                      title={
                        resumeData?.filename
                          ? "Reselect"
                          : brandContext?.isBrandAdmin
                            ? "Share JD"
                            : "Upload Resume"
                      }
                    >
                      <Paperclip className="h-5 w-5" />
                    </span>
                  </label>

                  <textarea
                    rows={1}
                    className="max-h-32 min-h-[2.75rem] min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-60"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={`Message ${brandContext?.brandName}…`}
                    disabled={messageLoading}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || messageLoading}
                    className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-all hover:opacity-75 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                    style={
                      input.trim() && !messageLoading && primaryBrandHex
                        ? { color: primaryBrandHex }
                        : undefined
                    }
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
            {/* Keep Resume component for file display and processing, but hidden file input */}
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
