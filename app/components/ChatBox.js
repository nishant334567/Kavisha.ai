"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Matches from "./Matches";
import Resume from "./Resume";
import Livechat from "./LiveChat";

export default function ChatBox({
  currentChatId,
  initialMessages,
  connections,
  chatLoading,
  openDetailsPanel,
  // initialMatches,
}) {
  const endOfMessagesRef = useRef(null);
  const [messages, setmessages] = useState([]);
  const [input, setInput] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);

  const { data: session } = useSession();
  const [matches, setMatches] = useState([]);
  const [resumeData, setResumedata] = useState({});
  const [hasDatacollected, setHasDatacollected] = useState();
  const [retry, setRetry] = useState(false);
  const [retryIndex, setRetryIndex] = useState(undefined);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openChat, setOpenChat] = useState(false);
  const [chatReceiverSession, setChatReceiverSession] = useState(null);
  const [chatSenderSession, setChatSenderSession] = useState(null);

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
  const [audioModeOn, setAudioModeOn] = useState(false);
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
    setmessages(initialMessages || []);
    // setMatches(initialMatches);
  }, [initialMessages, currentChatId]);

  useEffect(() => {
    //fetch resume data initially
    if (!currentChatId) return;

    const fetchResumeData = async () => {
      try {
        const response = await fetch(`/api/resume-data/${currentChatId}`);
        const data = await response.json();
        setResumedata({
          filename: data.resumeFilename,
          resumeSummary: data.resumeSummary,
        });
      } catch (error) {
        console.error("Error fetching resume data:", error);
      }
    };
    fetchResumeData();
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    const fetchDataCollectionStatus = async () => {
      try {
        const response = await fetch(`/api/all-data-fetched/${currentChatId}`);
        const data = await response.json();
        setHasDatacollected(data.allDataCollected);
      } catch (error) {
        console.error("Error fetching data collection status:", error);
      }
    };
    fetchDataCollectionStatus();
  }, [currentChatId]);

  useEffect(() => {
    if (!currentChatId) return;

    const fetchMatches = async () => {
      try {
        const response = await fetch(`/api/fetch-matches/${currentChatId}`);
        const data = await response.json();

        // setHasAllData(data.allDataCollected);
        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
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
  // Voice recording state
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

  const updateResume = (filename, summary) => {
    setResumedata({ filename: filename, resumeSummary: summary });
  };
  const openChatSession = (c1, c2) => {
    setChatReceiverSession(c2);
    setChatSenderSession(c1);
    setOpenChat((prev) => !prev);
  };
  const onResumeUpload = (newResumeData) => {
    if (newResumeData) {
      let resumeSubText = `I have sent my ${session?.user?.profileType === "recruiter" ? "JD" : "resume"}!! Please have a look at it.`;
      const resumeSent = async () => {
        const newUserMessage = {
          role: "user",
          message: resumeSubText,
        };
        const userText = resumeSubText;
        const updatedMessages = [...messages, newUserMessage];
        setmessages(updatedMessages);
        setInput("");
        setMessageLoading(true);
        const response = await fetch("/api/ai", {
          method: "POST",
          body: JSON.stringify({
            history: messages,
            userMessage: userText,
            jobseeker: session?.user?.profileType,
            sessionId: currentChatId,
            resume: newResumeData,
          }),
        });
        if (!response.ok) {
          setmessages([
            ...updatedMessages,
            {
              role: "assistant",
              message:
                "Kavisha failed to respond to that. Can you please try again?",
            },
          ]);
          setMessageLoading(false);
          setRetry(true);
          setRetryIndex(updatedMessages.length - 1);
          return;
        }
        const data = await response.json();

        setmessages([
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

  const retryMessage = async () => {
    const lastErrorRemoved = messages.filter((item, index) => {
      return index !== messages.length - 1;
    });
    const resendMessage = lastErrorRemoved[retryIndex];
    setmessages(lastErrorRemoved);
    setMessageLoading(true);

    // Use the conversation history up to the retry point, excluding the failed message
    const historyUpToRetry = lastErrorRemoved.slice(0, retryIndex);

    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        history: historyUpToRetry,
        userMessage: resendMessage?.message,
        jobseeker: session?.user?.profileType,
        sessionId: currentChatId,
        resume: resumeData.resumeSummary,
      }),
    });
    if (!response.ok) {
      setmessages([
        ...lastErrorRemoved,
        {
          role: "assistant",
          message:
            "Kavisha failed to respond to that. Can you please try again?",
        },
      ]);
      setRetry(true);
      setRetryIndex(lastErrorRemoved.length - 1);
      setMessageLoading(false);
      return;
    }
    const data = await response.json();

    setmessages([
      ...lastErrorRemoved,
      { role: "assistant", message: data.reply },
    ]);
    setMessageLoading(false);

    setRetry(false);
    setRetryIndex(undefined);
    if (
      data?.matchesWithObjectIds?.length > 0 &&
      data?.allDataCollected === "true"
    ) {
      setMatches(data?.matchesWithObjectIds);
      setHasDatacollected(true);
    }
    if (data?.allDataCollected === "false") {
      setHasDatacollected(false);
    }
  };
  const handleSubmit = async (voiceText = null) => {
    setAudioUrl(null);
    const messageText = (voiceText ?? input).trim();
    if (!messageText) {
      return;
    }

    // Clear input and recorder before sending
    setInput("");
    if (voiceText) {
      setTranscriptText("");
    }

    const newUserMessage = { role: "user", message: messageText };
    const updatedMessages = [...messages, newUserMessage];
    setmessages(updatedMessages);
    setMessageLoading(true);

    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        history: messages,
        userMessage: messageText,
        jobseeker: session?.user?.profileType,
        sessionId: currentChatId,
        resume: resumeData.resumeSummary,
      }),
    });
    if (!response.ok) {
      setmessages([
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

    setmessages([
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
    }
    if (data?.allDataCollected === "false") {
      setHasDatacollected(false);
    }
  };

  if (chatLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-orange-50 rounded-xl">
        <div className="text-center">
          <div className="text-lg text-slate-600 mb-4">
            Hang on, chats are loading, please wait...
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex sm:bg-orange-50 rounded-xl p-4">
      <div className="relative">
        <div className="rounded-xl h-[50vh] overflow-y-auto scrollbar-none p-2 font-light">
          <div className="gap-4 absolute right-2 px-2 flex rounded-lg -top-8 sm:top-0 bg-orange-50 sm:bg-orange-100">
            <div>
              <button
                // disabled={hasAllData}
                onClick={() => {
                  openDetailsPanel(1);
                }}
                className="p-1 rounded-sm  text-xs text-slate-700 hover:bg-orange-200 transition-colors"
              >
                <img src="circle.png" width={25} alt="Show Matches" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                  Show Matches
                </span>
              </button>
              <button
                onClick={() => {
                  openDetailsPanel(2);
                }}
                className="p-1 rounded-sm  text-xs  text-slate-700 hover:bg-orange-200 transition-colors"
              >
                {/* <img src="arrow.png" width={20} alt="Connection Requests" /> */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  data-supported-dps="24x24"
                  fill="currentColor"
                  // class="mercado-match"
                  width="24"
                  height="24"
                  focusable="false"
                >
                  <path d="M12 16v6H3v-6a3 3 0 013-3h3a3 3 0 013 3zm5.5-3A3.5 3.5 0 1014 9.5a3.5 3.5 0 003.5 3.5zm1 2h-2a2.5 2.5 0 00-2.5 2.5V22h7v-4.5a2.5 2.5 0 00-2.5-2.5zM7.5 2A4.5 4.5 0 1012 6.5 4.49 4.49 0 007.5 2z"></path>
                </svg>
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-black text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                  Connection Requests
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Audio Mode</span>
              <button
                onClick={() => setAudioModeOn((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  audioModeOn ? "bg-orange-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    audioModeOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm">{audioModeOn ? "Off" : "On"}</span>
            </div>
          </div>
          {messages.length > 0 &&
            messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left "}
              >
                {retryIndex === i && (
                  <button
                    onClick={() => {
                      retryMessage();
                    }}
                    className="text-red-600 px-2 py-1 "
                  >
                    <img src="reload.png" width={20} height={20} />
                  </button>
                )}
                <div
                  className={`px-4 py-2  rounded-lg inline-block ${
                    m.role === "user"
                      ? "w-full text-sm  mb-2 break-words ml-auto bg-white text-black rounded px-3 py-2 sm:max-w-[45%] border border-slate-200"
                      : "w-full text-sm  mb-2 break-words bg-white text-slate-800 rounded px-3 py-2 sm:max-w-[45%] border border-slate-200"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            ))}
          {messageLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl px-4 py-2 border border-orange-200 hover:shadow-md transition-all duration-300 cursor-default">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.3s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.6s" }}
                    ></div>
                  </div>
                  <span className="text-slate-600 text-sm font-medium">
                    Kavisha is thinking
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
        {!audioModeOn && (
          <form
            className="bottom-0 relative mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <input
              className="w-full border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition bg-white text-slate-800 pl-12 pr-12 py-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              disabled={messageLoading}
            />

            {/* Attachment icon on the left */}
            <label className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600 hover:text-blue-600 transition-colors">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="hidden"
              />
              <span
                className="text-lg hover:scale-110 transition-transform"
                title={
                  resumeData?.filename
                    ? "Reselect"
                    : session?.user?.profileType === "recruiter"
                      ? "Share JD"
                      : "Upload Resume"
                }
              >
                <img src="attach.png" width={20} />
              </span>
            </label>

            {/* Right-side controls: voice + (optional) main send */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="submit"
                disabled={!input.trim() || messageLoading}
                className={`p-0 bg-transparent border-none ${!input.trim() || messageLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                style={{ lineHeight: 0 }}
                tabIndex={0}
              >
                <img src="/message.png" height={25} width={25} alt="Send" />
              </button>
            </div>
          </form>
        )}
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

        {audioModeOn && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            {!isRecording && (
              <div className="w-full flex flex-col sm:flex-row items-center justify-around">
                {audioUrl && (
                  <audio
                    controls
                    src={audioUrl}
                    className="mt-1 w-full max-w-sm"
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
                <div className="relative mt-4 flex items-center justify-center">
                  {/* Callout for transcript / status */}
                  {isTranscribing && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="relative bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-slate-600">
                        Transcribing…
                        <div className="absolute left-1/2 top-full -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"></div>
                      </div>
                    </div>
                  )}
                  {transcribeError && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="relative bg-white border border-red-300 rounded-md shadow-lg px-3 py-2 text-sm text-red-600">
                        {transcribeError}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-red-300 rotate-45"></div>
                      </div>
                    </div>
                  )}
                  {transcriptText && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-10 w-[min(80vw,32rem)]">
                      <div className="relative bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <div className="text-xs text-slate-500 mb-1">
                          Voice transcript
                        </div>
                        <div className="text-slate-800 text-sm whitespace-pre-wrap break-words max-h-40 overflow-auto">
                          {transcriptText}
                        </div>
                        <div className="mt-2 flex gap-2 justify-end">
                          <button
                            onClick={() => handleSubmit(transcriptText)}
                            className="px-3 py-1.5 rounded-md bg-orange-600 text-white hover:bg-orange-700 text-sm"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => setTranscriptText("")}
                            className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                          >
                            Discard
                          </button>
                        </div>
                        <div className="absolute left-1/2 top-full -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"></div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => startRecording()}
                    className="ml-3 w-12 h-12 rounded-full border border-slate-300 bg-white hover:bg-slate-50 shadow-md flex items-center justify-center"
                    title="Start recording"
                  >
                    <img
                      src="/mic-closed.png"
                      width={20}
                      height={20}
                      alt="Mic"
                    />
                  </button>
                </div>
              </div>
            )}
            {isRecording && (
              <div className="flex flex-col items-center gap-3 mt-2">
                {/* Waveform placeholder: replace with your own video/gif later */}
                <div className="text-sm text-slate-700">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                  title="Stop recording"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {openChat && chatSenderSession && chatReceiverSession && (
        <Livechat
          chatData={{
            senderSession: chatSenderSession,
            receiverSession: chatReceiverSession,
          }}
          onClose={() => setOpenChat(false)}
        />
      )}
    </div>
  );
}
