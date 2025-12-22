"use client";
import { useState, useRef, useEffect } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import Matches from "./Matches";
import Resume from "./Resume";
import Livechat from "./LiveChat";
import Inbox from "./Inbox";
import ChunkModal from "./ChunkModal";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import { Mic, MicOff, Send, Paperclip } from "lucide-react";

export default function ChatBox({
  currentChatId,
  currentChatType,
  updateChatId,
  openDetailsPanel,
  toggleRightPanel,
  showInbox,
  setShowInbox,
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
  const [answerSources, setAnswerSources] = useState([]);
  const [openChunkModal, setOpenChunkModal] = useState(false);
  const [chunkData, setChunkData] = useState(null);

  //voice effects

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
    //fetch resume data initially
    if (!currentChatId || currentChatType === "lead_journey") return;

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
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId || currentChatType === "lead_journey") return;

    const fetchDataCollectionStatus = async () => {
      try {
        const response = await fetch(`/api/all-data-fetched/${currentChatId}`);
        const data = await response.json();
        setHasDatacollected(data.allDataCollected);
      } catch (error) {}
    };
    fetchDataCollectionStatus();
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId || currentChatType === "lead_journey") return;

    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/fetch-matches/${currentChatId}`);
        const data = await response.json();

        setHasDatacollected(data.allDataCollected);
        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        }
      } catch (error) {}
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
  const fetchChunkById = async (chunkId) => {
    if (!chunkId || !brandContext?.subdomain) return;

    try {
      const response = await fetch(
        `/api/admin/fetch-chunk?chunkId=${chunkId}&brand=${brandContext.subdomain}`
      );
      const data = await response.json();

      if (response.ok && data.chunk) {
        setChunkData(data.chunk);
        setOpenChunkModal(true);
      } else {
        alert("Failed to load chunk content");
      }
    } catch (error) {
      alert("Error loading chunk");
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
  };

  const onResumeUpload = (newResumeData) => {
    if (newResumeData) {
      let resumeSubText = `I have sent my ${brandContext?.isBrandAdmin ? "JD" : "resume"}!! Please have a look at it.`;
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
            prompt: getServicePrompt(),
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

  // Function to get service-specific prompt based on chat type
  const getServicePrompt = () => {
    if (!brandContext?.services || !currentChatType) return "";

    const service = brandContext.services.find(
      (s) => s.name?.toLowerCase() === currentChatType?.toLowerCase()
    );

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
    if (currentChatType !== "lead_journey") {
      response = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({
          history: historyToUse,
          userMessage: messageText || "",
          sessionId,
          resume: resumeData?.resumeSummary || "",
          type: currentChatType,
          prompt: getServicePrompt() || "",
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
          brand: brandContext.subdomain,
          prompt: getServicePrompt(),
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
        sources: data?.sources || [],
        intent: data?.intent,
      },
    ]);
    setMessageLoading(false);
    setAnswerSources(data?.sources);
    // Reset retry state on success
    if (isRetry) {
      setRetry(false);
      setRetryIndex(undefined);
    }

    // Handle matches and data collection status
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
      <div className="h-[60vh] mx-auto w-full lg:w-3/5 bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center text-slate-600 text-sm mb-3">
            <span className="mr-2 animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent"></span>
            Loading chat…
          </div>
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`animate-pulse rounded-2xl ${
                    i % 2 ? "bg-sky-100" : "bg-gray-100"
                  } ${i % 3 === 0 ? "w-1/2" : "w-2/3"} h-6`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-3/5 mx-auto flex bg-white rounded-xl p-4 h-[calc(100vh-56px)]">
      <div className="relative w-full flex-1 min-h-0 flex flex-col">
        <div className="rounded-xl w-full p-2 font-light h-full flex flex-col min-h-0">
          <div className="gap-2 absolute right-2 px-2 flex flex-col items-end rounded-lg -top-8 sm:top-0 bg-white sm:bg-gray-100 z-10"></div>
          {/* <p>Summary: {summaryUptilnow ?? ""}</p> */}
          <div className="flex-1 min-h-0 h-full overflow-y-scroll pt-1 mt-16 scrollbar-none">
            <div className="flex flex-col gap-2 min-h-full justify-end">
              {currentChatId &&
                messages.length > 0 &&
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`mb-4 ${
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
                    <div
                      className={`text-sm leading-relaxed break-words rounded-2xl px-4 py-2 sm:max-w-[60%] shadow-sm ${
                        m.role === "user"
                          ? "bg-sky-700 text-white"
                          : "bg-gray-50 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {m.role === "user" ? m.message : formatMessage(m.message)}
                    </div>
                    {/* Show requery for user messages */}
                    {m.role === "user" && m.requery && (
                      <div className="mt-1.5 max-w-[60%]">
                        <p className="text-xs text-gray-500 italic">
                          🔍 {m.requery}
                        </p>
                      </div>
                    )}
                    {/* Show sources for assistant messages */}
                    {m.role === "assistant" &&
                      m.sources &&
                      m.sources.length > 0 && (
                        <div className="mt-1.5 max-w-[60%] flex flex-wrap gap-1.5">
                          <span className="text-xs text-gray-500">
                            📚 Sources:
                          </span>
                          {m.sources.map((sourceId, idx) => (
                            <button
                              key={idx}
                              onClick={() => fetchChunkById(sourceId)}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              {sourceId.length > 10
                                ? `${sourceId.slice(0, 10)}...`
                                : sourceId}
                            </button>
                          ))}
                        </div>
                      )}
                    {/* Show payment QR code for personal_call intent */}
                    {m.role === "assistant" &&
                      m.intent === "personal_call" &&
                      brandContext?.acceptPayment &&
                      brandContext?.paymentQrUrl && (
                        <div className="mt-3 max-w-[60%]">
                          <img
                            src={brandContext.paymentQrUrl}
                            alt="Payment QR Code"
                            className="w-48 h-48 object-contain border border-gray-300 rounded-lg shadow-sm bg-white p-2"
                          />
                        </div>
                      )}
                  </div>
                ))}
              {messageLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl px-4 py-2 border border-gray-200 hover:shadow-md transition-all duration-300 cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                          style={{ animationDelay: "0.3s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                          style={{ animationDelay: "0.6s" }}
                        ></div>
                      </div>
                      <span className="text-slate-600 text-sm font-medium">
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
                  openDetailsPanel={openDetailsPanel}
                  openChatSession={openChatSession}
                />
              )}
              <div ref={endOfMessagesRef}></div>
            </div>
          </div>
          <div className="border-t border-slate-200 my-2 shrink-0"></div>
          <form
            className="bottom-0 relative mt-4 w-full shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <textarea
              rows={4}
              className="w-full border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 transition bg-white text-slate-800 pl-10 pr-14 sm:pl-12 sm:pr-24 py-2 leading-6 resize-none placeholder-transparent"
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
              <div className="pointer-events-none absolute inset-y-0 left-10 right-14 sm:left-12 sm:right-24 flex items-center text-slate-400 text-sm">
                Message {brandContext?.brandName}…
              </div>
            )}

            <label className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-blue-600 transition-colors">
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

            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center">
              {/* <span className="h-2 w-2 rounded-full bg-emerald-500"></span> */}

              <div className="relative">
                {isTranscribing && (
                  <div className="absolute bottom-full mb-2 right-0 z-10">
                    <div className="relative bg-white border border-slate-200 rounded-md shadow px-3 py-1.5 text-xs text-slate-600">
                      Transcribing…
                      <div className="absolute right-3 top-full w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"></div>
                    </div>
                  </div>
                )}
                {transcribeError && (
                  <div className="absolute bottom-full mb-2 right-0 z-10">
                    <div className="relative bg-white border border-red-300 rounded-md shadow px-3 py-1.5 text-xs text-red-600">
                      {transcribeError}
                      <div className="absolute right-3 top-full w-3 h-3 bg-white border-r border-b border-red-300 rotate-45"></div>
                    </div>
                  </div>
                )}
                {transcriptText && (
                  <div className="absolute bottom-full mb-2 right-0 z-10 w-[min(80vw,28rem)]">
                    <div className="relative bg-white border border-slate-200 rounded-lg p-3 shadow">
                      <div className="text-xs text-slate-500 mb-1">
                        Voice transcript
                      </div>
                      <div className="text-slate-800 text-sm whitespace-pre-wrap break-words max-h-40 overflow-auto">
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
                          className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                          type="button"
                        >
                          Discard
                        </button>
                      </div>
                      <div className="absolute right-3 top-full w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"></div>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    isRecording ? stopRecording() : startRecording()
                  }
                  className="py-1 rounded-md hover:bg-slate-100"
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <Mic className="w-5 h-5 text-red-600" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || messageLoading}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-white ${
                  !input.trim() || messageLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
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
      {/* Inbox for desktop and mobile */}
      {showInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:items-end md:justify-end bg-black bg-opacity-30 md:bg-transparent">
          <div className="w-full max-w-sm mx-auto md:mx-0 md:mr-6 md:mb-6 md:w-80 md:max-h-[60vh] overflow-y-auto shadow-2xl rounded-xl bg-white border border-slate-200">
            <Inbox
              onOpenChat={openChatSession}
              onClose={() => setShowInbox(false)}
            />
          </div>
        </div>
      )}
      {openChat && userA && userB && (
        <Livechat
          userA={userA}
          userB={userB}
          currentUserId={user?.id}
          onClose={() => setOpenChat(false)}
          connectionId={connectionId}
        />
      )}

      <ChunkModal
        isOpen={openChunkModal}
        onClose={() => {
          setOpenChunkModal(false);
          setChunkData(null);
        }}
        chunk={chunkData}
      />
    </div>
  );
}
