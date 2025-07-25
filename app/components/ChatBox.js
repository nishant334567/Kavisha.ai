"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Matches from "./Matches";
import RighPanel from "./Rightpanel";
import Resume from "./Resume";

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
  useEffect(() => {
    setmessages(initialMessages || []);
    // setMatches(initialMatches);
  }, [initialMessages, currentChatId]);

  useEffect(() => {
    //fetch resume data initially
    const fetchResumeData = async () => {
      const response = await fetch(`/api/resume-data/${currentChatId}`);
      const data = await response.json();
      setResumedata({
        filename: data.resumeFilename,
        resumeSummary: data.resumeSummary,
      });
    };
    fetchResumeData();
  }, [currentChatId]);

  useEffect(() => {
    const fetchDataCollectionStatus = async () => {
      const response = await fetch(`/api/all-data-fetched/${currentChatId}`);
      const data = await response.json();
      setHasDatacollected(data.allDataCollected);
    };
    fetchDataCollectionStatus();
  }, [currentChatId]);

  useEffect(() => {
    const fetchMatches = async () => {
      const response = await fetch(`/api/fetch-matches/${currentChatId}`);
      const data = await response.json();

      // setHasAllData(data.allDataCollected);
      if (Array.isArray(data.matches) && data.matches.length > 0) {
        setMatches(data.matches);
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

  // const openDetailsPanel = (type, dataObject) => {
  //   setType(type);
  //   setViewdata(dataObject);
  //   toggleRightPanel();
  // };
  const updateResume = (filename, summary) => {
    setResumedata({ filename: filename, resumeSummary: summary });
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
  const handleSubmit = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: "user", message: input };
    const userText = input;
    const updatedMessages = [...messages, newUserMessage];
    setmessages(updatedMessages);
    setInput("");
    setMessageLoading(true);

    // Use the current messages state as history (without the new message since it's passed separately)
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        history: messages, // Don't include the new message here - it's passed as userMessage
        userMessage: userText,
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
    <div className="flex md:bg-orange-50 rounded-xl p-4">
      <div className="relative">
        {
          <div className="absolute flex gap-1 right-0 -top-8 md:top-0 bg-gray-200 rounded-md">
            <div className="relative group">
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
            </div>
            <div className="relative group">
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
          </div>
        }
        <div className="rounded-xl h-[60vh] overflow-y-auto scrollbar-none p-2 font-light">
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
            <div className="text-slate-600 text-xs">Kavisha is typing...</div>
          )}

          {hasDatacollected && (
            <Matches
              currentChatId={currentChatId}
              matches={matches}
              openDetailsPanel={openDetailsPanel}
            />
          )}
          <div ref={endOfMessagesRef}></div>
        </div>

        <form
          className="bottom-0 relative mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            className="w-full border border-slate-300 px-8 py-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition bg-white text-slate-800"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
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

          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none"
            style={{ lineHeight: 0 }}
            tabIndex={0}
          >
            <img src="/message.png" height={25} width={25} alt="Send" />
          </button>
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

      {/* <div>
        {show && type === 1 && (
          <RighPanel
            type={1}
            matches={matches}
            session={session}
            currentChatId={currentChatId}
            toggleRightPanel={toggleRightPanel}
          />
        )}
        {show && type === 2 && (
          <RighPanel
            type={2}
            connections={connections}
            session={session}
            currentChatId={currentChatId}
            toggleRightPanel={toggleRightPanel}
          />
        )}
        {show && type === 3 && (
          <RighPanel
            type={3}
            session={session}
            currentChatId={currentChatId}
            detailsObject={viewData}
            toggleRightPanel={toggleRightPanel}
          />
        )}
      </div> */}
    </div>
  );
}
