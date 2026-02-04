"use client";
import { useState, useRef, useEffect } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";

import Resume from "./Resume";
import FormatText from "./FormatText";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { Mic, MicOff, Send, Paperclip } from "lucide-react";
import Matches from '@/app/components/Matches'

export default function ChatBox({
  currentChatId,
  // currentChatType,
  // updateChatId,
  // showInbox,
  // setShowInbox,
}) {
  const endOfMessagesRef = useRef(null);
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
  //voice model contants
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

  //voice effects

  // Fetch chat type from chat ID
  useEffect(() => {
    if (!currentChatId) {
      setCurrentChatType(null);
      setServiceKey(null);
      return;
    }

    const fetchChatType = async () => {
      try {
        const response = await fetch(`/api/session/${currentChatId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentChatType(data.role || null);
          setSessionName(data.name || null);
          setServiceKey(data.serviceKey || null);
        }
      } catch (error) {
        console.error("Error fetching chat type:", error);
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
        setHasDatacollected(data.allDataCollected);
      } catch (error) { }
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

        if (
          data?.matchesWithObjectIds?.length > 0 &&
          data?.allDataCollected === "true"
        ) {
          setMatches(data?.matchesWithObjectIds);
          setHasDatacollected(true);
        } else if (data?.allDataCollected === "true") {
          setMatches([]);
          setHasDatacollected(true);
        } else {
          setMatches([]);
          setHasDatacollected(false);
        }
      };
      resumeSent();
    }
  };

  // Function to get service-specific prompt based on chat type or serviceKey (for multiple lead_journey)
  const getServicePrompt = () => {
    if (!brandContext?.services) return "";
    // Prefer serviceKey when present (multiple lead_journey or same-name services)
    let service;
    if (serviceKey) {
      service = brandContext.services.find((s) => s._key === serviceKey);
    }
    if (!service && currentChatType) {
      service = brandContext.services.find(
        (s) => s.name?.toLowerCase() === currentChatType?.toLowerCase()
      );
    }
    if (!service) return "";

    const parts = [];
    if (service.intro) parts.push(`Introduction: ${service.intro}`);
    if (service.voice) parts.push(`Voice and Style: ${service.voice}`);
    if (service.behaviour) parts.push(`Behaviour: ${service.behaviour}`);

    return parts.length > 0 ? parts.join(". ") + " " : "";
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

    if (currentChatType === "buy_my_product") {
      response = await fetch("/api/buy-my-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText || "",
          sessionId,
          // resume: resumeData?.resumeSummary || "",
          type: currentChatType,
          prompt: getServicePrompt() || "",
          userId: user?.id,
        }),
      });
    } else if (currentChatType === "buy_my_service") {
      response = await fetch("/api/buy-my-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText || "",
          sessionId,
          type: currentChatType,
          prompt: getServicePrompt() || "",
          userId: user?.id,
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

    setMessages([
      ...updatedMessagesWithRequery,
      {
        role: "assistant",
        message: data.reply,
        sourceUrls: data?.sourceUrls || [],
        intent: data?.intent || "",
      },
    ]);
    setMessageLoading(false);
    // Reset retry state on success
    if (isRetry) {
      setRetry(false);
      setRetryIndex(undefined);
    }

    // Handle matches and data collection status (skip for buy_my_product and buy_my_service)
    if (
      currentChatType !== "buy_my_product" &&
      currentChatType !== "buy_my_service"
    ) {
      if (
        data?.matchesWithObjectIds?.length > 0 &&
        data?.allDataCollected === "true"
      ) {
        setMatches(data?.matchesWithObjectIds);
        setHasDatacollected(true);
      } else if (data?.allDataCollected === "true") {
        setMatches([]);
        setHasDatacollected(true);
      } else if (data?.allDataCollected === "false") {
        setHasDatacollected(false);
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

  if (chatLoading) {
    return (
      <div className="h-full mx-auto w-full lg:w-3/5 bg-background rounded-xl p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-6 h-6 border-2 border-border rounded-full"></div>
            <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-t-[#59646F] rounded-full animate-spin"></div>
          </div>
          <div className="text-[#59646F] text-xs font-medium">
            Loading chat…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full md:w-3/5 flex bg-background rounded-xl p-2 md:p-4 h-full min-h-0 mx-2 md:mx-4 overflow-hidden">
      <div className="relative w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="rounded-xl w-full p-1 md:p-2 font-light h-full flex flex-col min-h-0 overflow-hidden">
          <div className="gap-2 absolute right-2 px-2 flex flex-col items-end rounded-lg -top-8 sm:top-0 bg-card sm:bg-muted-bg z-10"></div>
          {/* Logo Section - flex-1 */}
          <div className="flex-2 flex flex-col md:flex-row justify-center items-center md:gap-4 md:items-start md:mb-8 my-4 min-h-0  md:mt-16 md:px-2">
            <img
              src={brandContext?.logoUrl}
              className="rounded-full w-[65px] h-[65px] object-cover flex-shrink-0"
            />
            <div className="flex flex-col items-center md:items-start">
              <p className="font-akshar font-medium mt-2 md:mt-0">
                {brandContext?.brandName.toUpperCase() || ""}
              </p>
              <div className="flex font-akshar border border-border my-2">
                <button
                  className="bg-foreground text-background px-1.5 py-0.5 cursor-default"
                  disabled
                >
                  {(() => {
                    const isCommunityChat = [
                      "job_seeker",
                      "recruiter",
                      "friends",
                    ].includes(currentChatType?.toLowerCase());
                    return isCommunityChat ? "COMMUNITY" : "SERVICE";
                  })()}
                </button>
                <button
                  className="bg-background text-foreground px-1.5 py-0.5 cursor-default border border-border"
                  disabled
                >
                  {(() => {
                    const isCommunityChat = [
                      "job_seeker",
                      "recruiter",
                      "friends",
                    ].includes(currentChatType?.toLowerCase());

                    if (isCommunityChat) {
                      const communityTitles = {
                        job_seeker: "Looking for work",
                        recruiter: "Looking at hiring",
                        friends: "Looking for a friend",
                      };
                      return (
                        communityTitles[
                          currentChatType?.toLowerCase()
                        ]?.toUpperCase() ||
                        currentChatType?.split("_").join(" ").toUpperCase() ||
                        ""
                      );
                    } else {
                      // Use name from database if available, otherwise fallback to brandContext lookup
                      if (sessionName) {
                        return sessionName.toUpperCase();
                      }

                      return (
                        currentChatType?.split("_").join(" ").toUpperCase() ||
                        ""
                      );
                    }
                  })()}
                </button>
              </div>
            </div>
          </div>
          {/* Messages Section - flex-2, scrollable */}
          <div className="flex-[4] min-h-0 overflow-y-scroll overflow-x-hidden scrollbar-none">
            {/* <div className="flex flex-col gap-2 min-h-full justify-end"> */}
            {currentChatId &&
              messages.length > 0 &&
              messages.map((m, i) => (
                <div
                  key={i}
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
                      <div className="text-white font-normal font-figtree leading-relaxed break-words rounded-2xl px-3 py-2 md:px-4 max-w-[90%] sm:max-w-[60%] bg-[#59646F]">
                        <FormatText text={m.message} />
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
                      <div className="font-normal font-figtree leading-relaxed break-words rounded-2xl px-3 py-2 md:px-4 max-w-[90%] sm:max-w-[60%] bg-muted-bg min-w-0">
                        <FormatText text={m.message} />
                      </div>
                    </div>
                  )}

                  {/* Show requery for user messages */}
                  {m.role === "user" && m.requery && (
                    <div className="mt-1.5 max-w-[90%] sm:max-w-[60%] min-w-0">
                      <p className="text-xs text-muted italic break-words">
                        🔍 {m.requery}
                      </p>
                    </div>
                  )}
                  {/* Show sources for assistant messages */}
                  {m.role === "assistant" && m.sourceUrls?.length > 0 && (
                    <div className="mt-1.5 max-w-[90%] sm:max-w-[60%] min-w-0 flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted">
                        📚 Sources:
                      </span>
                      {m.sourceUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          {url.length > 30 ? `${url.slice(0, 30)}...` : url}
                        </a>
                      ))}
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
              <div className="flex justify-start mb-4">
                <div className="bg-[#59646F] rounded-2xl px-4 py-2 hover:shadow-md transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#FFEED8] rounded-full animate-pulse"></div>
                      <div
                        className="w-2 h-2 bg-[#FFEED8] rounded-full animate-pulse"
                        style={{ animationDelay: "0.3s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-[#FFEED8] rounded-full animate-pulse"
                        style={{ animationDelay: "0.6s" }}
                      ></div>
                    </div>
                    <span className="text-[#FFEED8] text-sm font-medium">
                      {brandContext?.brandName} is thinking
                    </span>
                  </div>
                </div>
              </div>
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
                  className={`inline-flex items-center justify-center p-2 rounded-lg ${!input.trim() || messageLoading
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
