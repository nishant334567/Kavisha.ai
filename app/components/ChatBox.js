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
}) {
  const endOfMessagesRef = useRef(null);
  const [messages, setmessages] = useState([]);
  const [input, setInput] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);

  const { data: session } = useSession();
  const [matches, setMatches] = useState([]);
  const [type, setType] = useState(0);
  const [viewData, setViewdata] = useState({});
  const [show, setShow] = useState(false);
  const [resumeData, setResumedata] = useState({});
  const [hasDatacollected, setHasDatacollected] = useState();

  useEffect(() => {
    setmessages(initialMessages || []);
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
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages]);

  const openDetailsPanel = (type, dataObject) => {
    setType(type);
    setViewdata(dataObject);
    toggleRightPanel();
  };
  const updateResume = (filename, summary) => {
    setResumedata({ filename: filename, resumeSummary: summary });
  };
  const onResumeUpload = (newResumeData) => {
    if (newResumeData) {
      let resumeSubText = `I have sent my ${session?.user?.profileType === "recruiter" ? "JD" : "resume"}!! Please have a look at it`;
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
  const handleSubmit = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: "user", message: input };
    const userText = input;
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

  const toggleRightPanel = () => {
    setShow((prev) => !prev);
  };

  return (
    <div className="flex">
      <div>
        {messages.length === 0 && (
          <div>Start a conversation or select a chat to view messages.</div>
        )}
        <div className="px-4 shadow-md rounded-xl w-[100%] h-[60vh] overflow-y-auto scrollbar-none pb-1 text-white font-light">
          {messages.length > 0 &&
            messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left "}
              >
                <div
                  className={`px-4 py-2  rounded-lg inline-block ${
                    m.role === "user"
                      ? "w-full text-sm shadow-md mb-2 break-words ml-auto bg-gray-800 text-gray-200 rounded px-3 py-2 sm:max-w-[50%]"
                      : "w-full text-sm shadow-md mb-2 break-words bg-gray-100 text-gray-900 rounded px-3 py-2 sm:max-w-[50%]"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            ))}
          {messageLoading && (
            <div className="text-gray-700 text-xs">Kavisha is typing...</div>
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
        <div className="flex mt-4">
          <button
            // disabled={hasAllData}
            onClick={() => {
              (setType(1), toggleRightPanel());
            }}
            className="w-[25%] px-2 py-1 rounded-sm shadow-md text-xs"
          >
            Show Matches
          </button>
          <button
            onClick={() => {
              (setType(2), toggleRightPanel());
            }}
            className="w-[25%] px-2 py-1 rounded-sm shadow-md text-xs"
          >
            Connection Requests
          </button>
        </div>
        <form
          className="flex gap-3 justify-between mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
          />
          <button type="submit" disabled={!input.trim()}>
            <img src="/message.png" height={25} width={25} />
          </button>
        </form>
        <Resume
          resumeData={resumeData}
          updateResume={updateResume}
          currentChatId={currentChatId}
          onResumeUpload={onResumeUpload}
        />
      </div>

      <div>
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
      </div>
    </div>
  );
}
