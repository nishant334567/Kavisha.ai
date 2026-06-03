"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

import Resume from "./Resume";
import FormatText from "./FormatText";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { Send, Paperclip, Mic, MicOff } from "lucide-react";
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
  showPoweredByFooter = false,
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
        const response = await fetch(`/api/session/${currentChatId}`);
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
          setEligibleForMatches(Boolean(data.allDataCollected) || pct >= 40);
        }
      } catch (error) {
        console.error("Error fetching chat type:", error);
      } finally {
        setSessionDetailsLoading(false);
      }
    };

    fetchChatType();
  }, [currentChatId]);

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

  const uploadAudio = async (audioBlob) => {
    setIsTranscribing(true);
    setTranscribeError("");
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
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
    } catch {
      setTranscribeError("Failed to read transcription response.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, [isRecording]);

  const startRecording = async () => {
    setAudioUrl(null);
    setTranscriptText("");
    setTranscribeError("");
    try {
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
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        uploadAudio(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setTranscribeError("Microphone access was denied or unavailable.");
    }
  };

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
  }, [isRecording, stopRecording]);

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
      setTranscriptText("");
      setAudioUrl(null);
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

    const failResponse = (assistantMessage) => {
      setMessages([
        ...updatedMessages,
        { role: "assistant", message: assistantMessage },
      ]);
      setRetry(true);
      setRetryIndex(updatedMessages.length - 1);
      if (!isRetry) setInput(messageText);
    };

    try {
      const fetchOpts = {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      };

      const isLeadJourney =
        String(currentChatType || "").toLowerCase() === "lead_journey";

      const isCollectData =
        serviceType === "collect-data" ||
        currentChatType === "collect_data";

      const response = isCollectData
        ? await fetch("/api/collect-data", {
          ...fetchOpts,
          body: JSON.stringify({
            history: historyToUse,
            userMessage: messageText || "",
            sessionId,
          }),
        })
        : isLeadJourney
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
        !isLeadJourney &&
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
  const headerPillTitle =
    secondHeaderDisplay || brandContext?.brandName || "";

  return (
    <>
      <div className="font-baloo mx-auto flex h-full min-h-0 w-full max-w-full flex-1 overflow-hidden rounded-xl bg-background p-0 md:w-3/5 md:px-1">
        <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl font-light">
            <div className="relative min-h-0 flex-1">
              {/* Messages — scroll behind floating pill */}
              <div
                ref={messagesScrollRef}
                onScroll={updateStickyFromScroll}
                onWheel={updateStickyFromScroll}
                onTouchMove={updateStickyFromScroll}
                className="absolute inset-0 overflow-y-scroll overflow-x-hidden scrollbar-none px-2 pb-2 pt-12 md:pt-14"
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
                        <div className="w-full min-w-0 max-w-full py-0.5 text-sm font-normal font-baloo leading-relaxed break-words text-foreground">
                          <FormatText text={m.message} />
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
                          <div className="mt-1.5 w-full min-w-0 max-w-full">
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
                          <div className="mt-1.5 flex w-full min-w-0 max-w-full flex-nowrap items-center gap-0.5">
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
                          <div className="mt-3 w-full min-w-0 max-w-full">
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

                {eligibleForMatches && (
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
                <div ref={endOfMessagesRef}></div>
              </div>

              {(headerPillTitle || brandContext?.logoUrl) && (
                <header className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-2 md:top-2.5">
                  <div className="chat-session-pill pointer-events-auto inline-flex max-w-[min(100%,22rem)] items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 sm:max-w-md sm:pr-4">
                    {brandContext?.logoUrl ? (
                      <img
                        src={brandContext.logoUrl}
                        alt=""
                        className="size-[34px] shrink-0 rounded-full object-cover ring-1 ring-border/40"
                      />
                    ) : null}
                    {headerPillTitle ? (
                      <p className="min-w-0 truncate font-baloo text-sm font-semibold leading-none text-foreground">
                        {headerPillTitle}
                      </p>
                    ) : null}
                  </div>
                </header>
              )}

              {/* {showOnboardingProgress && (
                <div className="pointer-events-none absolute inset-x-0 top-[2.75rem] z-20 flex justify-start px-2 md:top-[3.25rem]">
                  <div
                    className="pointer-events-auto inline-flex items-baseline gap-0.5 rounded-md border border-border/45 bg-muted/35 px-2.5 py-1 text-[13px] italic tabular-nums shadow-sm backdrop-blur-md dark:border-border/35 dark:bg-muted/25"
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
              )} */}
            </div>

            <div className="relative z-20 mt-auto shrink-0 bg-background px-2 pt-0.5 max-md:pb-0 md:z-10 md:mt-0 md:pb-0 md:pt-0.5">
              {showIntroSuggestedQuestions &&
                introSuggestedQuestions.length > 0 && (
                  <SuggestedQuestionsCarousel
                    className="pt-4 mb-3 max-md:mb-2.5 md:mb-3 md:pt-5"
                    accentColor={primaryBrandHex}
                    questions={introSuggestedQuestions}
                    disabled={messageLoading}
                    onSelect={(q) => handleSubmit(String(q).trim())}
                  />
                )}
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
                    disabled={messageLoading || isRecording || isTranscribing}
                  />

                  <div className="relative mb-0.5 shrink-0">
                    {isTranscribing && (
                      <div className="absolute bottom-full right-0 z-20 mb-2">
                        <div className="relative rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow">
                          Transcribing…
                          <div className="absolute right-3 top-full h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
                        </div>
                      </div>
                    )}
                    {transcribeError && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 max-w-[min(80vw,20rem)]">
                        <div className="relative rounded-md border border-red-300 bg-card px-3 py-1.5 text-xs text-red-600 shadow">
                          {transcribeError}
                          <div className="absolute right-3 top-full h-3 w-3 rotate-45 border-b border-r border-red-300 bg-card" />
                        </div>
                      </div>
                    )}
                    {transcriptText && (
                      <div className="absolute bottom-full right-0 z-20 mb-2 w-[min(80vw,28rem)]">
                        <div className="relative rounded-lg border border-border bg-card p-3 shadow">
                          <div className="mb-1 text-xs text-muted">
                            Voice transcript
                          </div>
                          <div className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm text-foreground">
                            {transcriptText}
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSubmit(transcriptText)}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60 ${!primaryBrandHex ? "bg-highlight" : ""}`}
                              style={
                                primaryBrandHex
                                  ? { backgroundColor: primaryBrandHex }
                                  : undefined
                              }
                              disabled={messageLoading}
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              onClick={() => setTranscriptText("")}
                              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted-bg"
                            >
                              Discard
                            </button>
                          </div>
                          <div className="absolute right-3 top-full h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        isRecording ? stopRecording() : startRecording()
                      }
                      disabled={messageLoading || isTranscribing}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      title={
                        isRecording
                          ? `Stop recording (${seconds}s)`
                          : "Start voice message"
                      }
                      aria-label={
                        isRecording ? "Stop recording" : "Start recording"
                      }
                    >
                      {isRecording ? (
                        <Mic className="h-5 w-5 text-red-600" />
                      ) : (
                        <MicOff className="h-5 w-5" />
                      )}
                    </button>
                  </div>

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
              {showPoweredByFooter && (
                <PoweredByKavisha className="py-0 pt-2 pb-0 text-[10px] leading-none md:hidden" />
              )}
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
