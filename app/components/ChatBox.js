"use client";
import { useState, useRef, useEffect } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

import Resume from "./Resume";
import FormatText from "./FormatText";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import {
  Mic,
  MicOff,
  Send,
  Paperclip,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Matches from "@/app/components/Matches";
import { normalizeBrandHex } from "@/app/lib/brandTheme";
import AssistantSourceCards from "@/app/components/AssistantSourceCards";
import AssistantReplyCopyButton from "@/app/components/AssistantReplyCopyButton";
import ChatThinkingRow from "@/app/components/ChatThinkingRow";

export default function ChatBox({
  currentChatId,
  // currentChatType,
  // updateChatId,
  // showInbox,
  // setShowInbox,
}) {
  const endOfMessagesRef = useRef(null);
  const suggestedQuestionsScrollRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const brandContext = useBrandContext();
  const { user } = useFirebaseSession();
  const [matches, setMatches] = useState([]);
  const [resumeData, setResumedata] = useState({});
  const [hasDatacollected, setHasDatacollected] = useState();
  const [retry, setRetry] = useState(false);
  const [retryIndex, setRetryIndex] = useState(undefined);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [userA, setUserA] = useState(null);
  const [userB, setUserB] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
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
          if (data.allDataCollected) {
            setHasDatacollected(true);
          } else {
            setHasDatacollected(false);
          }
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
      } catch (error) {}
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
        setHasDatacollected(data.allDataCollected);
      } catch (error) {}
    };
    fetchDataCollectionStatus();
  }, [currentChatId, currentChatType]);

  useEffect(() => {
    // Fetch matches from DB for any chat
    if (!currentChatId) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/fetch-matches/${currentChatId}`);
        const data = await response.json();

        setHasDatacollected(data.allDataCollected);
        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error(`[Matches] Error fetching matches:`, error);
        setMatches([]);
      }
    };

    fetchMatches();
  }, [currentChatId]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages]);

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
  const openChatSession = (userA, userB) => {
    setUserA(userA);
    setUserB(userB);
    setConnectionId([userA, userB].sort().join("_"));
    setOpenChat((prev) => !prev);

    // Close inbox on mobile when opening a chat
    // if (typeof window !== "undefined" && window.innerWidth < 768) {
    //   setShowInbox(false);
    // }
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

        if (data?.allDataCollected === "true") {
          setHasDatacollected(true);
          try {
            const res = await fetch(`/api/fetch-matches/${currentChatId}`);
            const md = await res.json();
            setMatches(Array.isArray(md.matches) ? md.matches : []);
          } catch {
            setMatches([]);
          }
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

    setMessages(updatedMessages);
    setMessageLoading(true);
    let response;

    if (currentChatType !== "lead_journey") {
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

    setMessages([
      ...updatedMessagesWithRequery,
      {
        role: "assistant",
        message: data.reply,
        sourceUrls: data?.sourceUrls || [],
        sourceCards: data?.sourceCards || [],
        intent: data?.intent || "",
      },
    ]);
    setMessageLoading(false);
    // Reset retry state on success
    if (isRetry) {
      setRetry(false);
      setRetryIndex(undefined);
    }

    if (data?.allDataCollected === "true") {
      setHasDatacollected(true);
      try {
        const res = await fetch(`/api/fetch-matches/${sessionId}`);
        const md = await res.json();
        setMatches(Array.isArray(md.matches) ? md.matches : []);
      } catch {
        setMatches([]);
      }
    } else if (data?.allDataCollected === "false") {
      setHasDatacollected(false);
    }

    if (
      currentChatType !== "lead_journey" &&
      (isCommunitySession || isJobsRequirementPost)
    ) {
      const pct = data?.onboardingProgress?.percent;
      if (typeof pct === "number" && !Number.isNaN(pct)) {
        setOnboardingPercent(Math.max(0, Math.min(100, pct)));
      }
    }
  };
  useEffect(() => {
    if (!currentChatId) {
      return;
    }
    setMessages([]);
    setChatLoading(true);
    const fetchChat = async () => {
      const response = await fetch(`/api/logs/${currentChatId}`);
      const data = await response.json();
      setMessages(data || []);
      setChatLoading(false);
    };

    fetchChat();
  }, [currentChatId]);

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
              className={`absolute inset-0 h-6 w-6 animate-spin rounded-full border-2 border-transparent ${
                !primaryBrandHex ? "border-t-[#59646F]" : ""
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
              className={`absolute inset-0 h-6 w-6 animate-spin rounded-full border-2 border-transparent ${
                !primaryBrandHex ? "border-t-[#59646F]" : ""
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
    (isCommunitySession || isJobsRequirementPost) &&
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

  const firstHeaderBadge =
    isCommunitySession && isCommunityRoleType ? "COMMUNITY" : "SERVICE";
  const secondHeaderBadge = isCommunityRoleType
    ? communitySecondBadgeLabel
    : sessionName
      ? sessionName.toUpperCase()
      : currentChatType?.split("_").join(" ").toUpperCase() || "";

  return (
    <div className="font-baloo mx-auto flex h-full min-h-0 w-full max-w-full overflow-hidden rounded-xl bg-background p-2 md:w-3/5 md:p-4">
      <div className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="rounded-xl w-full p-1 md:p-2 font-light h-full flex flex-col min-h-0 overflow-hidden">
          {/* Logo + role badges only (brand name is in the navbar on /chats and /community). */}
          <div className="flex-2 my-4 flex min-h-0 flex-col items-center justify-center md:mb-8 md:mt-4 md:flex-row md:items-center md:gap-4 md:px-2">
            <img
              src={brandContext?.logoUrl}
              alt=""
              className="h-[65px] w-[65px] flex-shrink-0 rounded-full object-cover"
            />
            <div className="flex flex-col items-center md:items-start">
              <div className="my-2 flex border border-border font-baloo">
                <button
                  type="button"
                  className="cursor-default bg-foreground px-1.5 py-0.5 text-background"
                  disabled
                >
                  {firstHeaderBadge}
                </button>
                <button
                  type="button"
                  className="cursor-default border border-border bg-background px-1.5 py-0.5 text-foreground"
                  disabled
                >
                  {secondHeaderBadge}
                </button>
              </div>
            </div>
          </div>

          {showOnboardingProgress && (
              <div className="mb-2 flex w-full shrink-0 justify-start px-1 md:mb-3 md:px-2">
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

          {/* Messages Section - flex-2, scrollable */}
          <div className="flex-[4] min-h-0 overflow-y-scroll overflow-x-hidden scrollbar-none">
            {/* <div className="flex flex-col gap-2 min-h-full justify-end"> */}
            {currentChatId &&
              messages.length > 0 &&
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-4 w-full min-w-0 ${
                    m.role === "user"
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
                    (m.sourceCards?.length > 0 || m.sourceUrls?.length > 0) && (
                      <div className="mt-1.5 w-full min-w-0">
                        {m.sourceCards?.length > 0 ? (
                          <AssistantSourceCards
                            items={m.sourceCards}
                            primaryHex={primaryBrandHex}
                          />
                        ) : (
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
                        )}
                      </div>
                    )}
                  {m.role === "assistant" &&
                    currentChatType?.toLowerCase() === "lead_journey" && (
                      <div className="mt-1.5 w-full min-w-0 max-w-[90%] sm:max-w-[60%]">
                        <AssistantReplyCopyButton
                          message={m.message}
                          sourceCards={m.sourceCards}
                          sourceUrls={m.sourceUrls}
                          readMoreUrl={brandContext?.assistantCopyReadMoreUrl}
                          brandSubdomain={brandContext?.subdomain}
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

            {hasDatacollected && (
              <Matches
                currentChatId={currentChatId}
                matches={matches}
                openChatSession={openChatSession}
              />
            )}
            <div ref={endOfMessagesRef}></div>
            {/* </div> */}
          </div>
          {/* Initial questions: ONLY for lead_journey */}
          {currentChatType?.toLowerCase() === "lead_journey" &&
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
              className="relative w-full flex-1 flex flex-col min-h-0"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <textarea
                className="px-12 py-3 w-full flex-1 border border-border rounded-xl focus:outline-none focus:ring-0 focus:border-ring transition bg-input text-foreground leading-6 resize-none placeholder-transparent min-h-0"
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

              {(!input || input.trim().length === 0) && (
                <div className="pointer-events-none absolute inset-y-0 left-12 right-20 flex items-center text-muted text-sm">
                  Message {brandContext?.brandName}…
                </div>
              )}

              <label className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-foreground transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
                <span
                  className="hover:scale-110 transition-transform"
                  title={
                    resumeData?.filename
                      ? "Reselect"
                      : brandContext?.isBrandAdmin
                        ? "Share JD"
                        : "Upload Resume"
                  }
                >
                  <Paperclip className="w-5 h-5" />
                </span>
              </label>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="relative">
                  {isTranscribing && (
                    <div className="absolute bottom-full mb-2 right-0 z-10">
                      <div className="relative bg-card border border-border rounded-md shadow px-3 py-1.5 text-xs text-foreground">
                        Transcribing…
                        <div className="absolute right-3 top-full w-3 h-3 bg-card border-r border-b border-border rotate-45"></div>
                      </div>
                    </div>
                  )}
                  {transcribeError && (
                    <div className="absolute bottom-full mb-2 right-0 z-10">
                      <div className="relative bg-card border border-red-300 rounded-md shadow px-3 py-1.5 text-xs text-red-600">
                        {transcribeError}
                        <div className="absolute right-3 top-full w-3 h-3 bg-card border-r border-b border-red-300 rotate-45"></div>
                      </div>
                    </div>
                  )}
                  {transcriptText && (
                    <div className="absolute bottom-full mb-2 right-0 z-10 w-[min(80vw,28rem)]">
                      <div className="relative bg-card border border-border rounded-lg p-3 shadow">
                        <div className="text-xs text-muted mb-1">
                          Voice transcript
                        </div>
                        <div className="text-foreground text-sm whitespace-pre-wrap break-words max-h-40 overflow-auto">
                          {transcriptText}
                        </div>
                        <div className="mt-2 flex gap-2 justify-end">
                          <button
                            onClick={() => handleSubmit(transcriptText)}
                            className="px-3 py-1.5 rounded-md bg-orange-600 text-white hover:bg-orange-700 text-xs"
                            type="button"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => setTranscriptText("")}
                            className="px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-muted-bg text-xs"
                            type="button"
                          >
                            Discard
                          </button>
                        </div>
                        <div className="absolute right-3 top-full w-3 h-3 bg-card border-r border-b border-border rotate-45"></div>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      isRecording ? stopRecording() : startRecording()
                    }
                    className="p-2 rounded-lg hover:bg-muted-bg transition-colors"
                    title={isRecording ? "Stop recording" : "Start recording"}
                  >
                    {isRecording ? (
                      <Mic className="w-5 h-5 text-red-600" />
                    ) : (
                      <MicOff className="w-5 h-5 text-muted" />
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || messageLoading}
                  className={`inline-flex items-center justify-center p-2 rounded-lg ${
                    !input.trim() || messageLoading
                      ? "bg-muted-bg text-muted cursor-not-allowed"
                      : "bg-[#59646F] text-[#FFEED8] hover:bg-[#4a5568] active:scale-95"
                  } transition-all`}
                  title="Send message"
                >
                  <Send className="w-5 h-5" />
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
  );
}
