"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import shortenFileName from "@/app/utils/shortenfilename";
import MatchCard from "@/app/components/MatchCard";
import Loader from "./components/Loader";

export default function Home() {
  const { data: session, status } = useSession();
  const [allChats, setAllchats] = useState([]);
  const router = useRouter();
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [messages, setmessages] = useState([]);
  const [input, setInput] = useState("");
  const [currenChatId, setCurrentChatId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionResumes, setSessionResumes] = useState({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [summary, setSummary] = useState("");
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState("");
  const endOfMessagesRef = useRef(null);
  const [messageLoading, setMessageLoading] = useState(false);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
    } else if (!session.user?.profileType) {
      router.push("/set-role");
    }

    fetchChats();
  }, [status, session]);

  useEffect(() => {}, [currenChatId, sessionResumes]);

  const findMatches = async () => {
    setMatchesLoading(true);
    try {
      const response = await fetch(`/api/matches/${currenChatId}`);
      const data = await response.json();
      if (data?.matches.length > 0) setMatches(data?.matches);
    } catch (err) {
      setMatchesError(err);
    }
    setMatchesLoading(false);
  };
  const fetchChats = async () => {
    const response = await fetch("/api/allchats");
    const data = await response.json();
    setAllchats(data?.sessions || []);
    if (data.sessions) {
      const resumes = {};
      data.sessions.forEach((s) => {
        resumes[s.id] = {
          filename: s.resumeFilename || "",
          summary: s.resumeSummary || "",
        };
      });
      setSessionResumes(resumes);
    }

    if (data?.sessions?.length > 0) {
      setCurrentChatId(data.sessions[0].id);
      openChat(data.sessions[0].id);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (resume) {
      alert(`Selected file: ${resume.name}`);

      formData.append("file", resume);
      formData.append("sessionId", currenChatId);
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      let extractedText;
      if (data.text) {
        extractedText = data.text;
        alert("Resume proceses, will consider that in you job search journey");
      } else {
        extractedText = "No text extracted";
        alert("No text parsed from you resume, try uploading again");
      }
      setResumeText(extractedText);

      setSessionResumes((prev) => ({
        ...prev,
        [currenChatId]: {
          filename: resume.name,
          summary: extractedText,
        },
      }));

      fetchChats();
      setResume(null);
      setFileInputKey((prev) => prev + 1);
    } else {
      alert(`No resume selected`);
    }
  };
  const handleDelete = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/upload-resume", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currenChatId }),
      });
      const data = await response.json();
      if (data.success && sessionResumes[currenChatId]) {
        setSessionResumes((prev) => ({
          ...prev,
          [currenChatId]: {
            filename: "",
            summary: "",
          },
        }));
        setResume(null);
        setResumeText("");
        setFileInputKey((prev) => prev + 1);
      } else {
        alert(data.error || "Failed to delete resume");
      }
    } catch (err) {}
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
        sessionId: currenChatId,
        resume: resumeText,
      }),
    });

    if (!response.ok) {
      setmessages([
        ...updatedMessages,
        {
          role: "assistant",
          message: "Error: Could not get response from Open AI",
        },
      ]);
      return;
    }

    const data = await response.json();
    setmessages([
      ...updatedMessages,
      { role: "assistant", message: data.reply },
    ]);
    setSummary(data?.summary || "");
    setMessageLoading(false);
  };

  if (status === "loading" || !session?.user?.profileType) {
    return <Loader />;
  }

  const addNewChat = async () => {
    const res = await fetch("/api/newchatsession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session?.user?.id,
        role: session?.user?.profileType,
      }),
    });
    const data = await res.json();
    if (data.success) {
      fetchChats();
      setCurrentChatId(data.sid);
      setResumeText("");
    } else {
      alert("Failed to create new chat room");
    }
  };

  const openChat = async (chatId) => {
    if (chatId === "" || !chatId) return;
    const response = await fetch(`/api/logs/${chatId}`);
    const data = await response.json();
    setmessages(data);

    const sessionResume = sessionResumes[chatId];
    setResumeText(sessionResume?.summary || "");
  };
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 via-amber-50 to-rose-50">
        <div className="mb-4 text-center">
          <h1 className="text-5xl font-bold text-emerald-700 ">
            Hi {session?.user?.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-emerald-400 mt-1 text-lg">
            {session?.user?.profileType === "recruiter"
              ? "Lets find right set of candidates for you!"
              : "Lets find your dream job!!"}
          </p>
        </div>
        <button
          className="md:hidden fixed top-4 left-4 z-30 bg-emerald-400 text-white rounded-full p-3 shadow-lg focus:outline-none"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label="Toggle chat sessions"
        >
          {sidebarOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
        <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 bg-emerald-50/80 backdrop-blur-md rounded-2xl shadow-xl p-6 relative">
          <div
            className={`w-full md:w-1/4 flex flex-col gap-4 border-r border-amber-100 pr-4 bg-emerald-50 md:static fixed top-0 left-0 h-full z-20 transition-transform duration-300 md:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:!translate-x-0`}
            style={{ height: "32rem", maxWidth: "18rem" }}
          >
            <div className="flex justify-between items-center mb-2 mt-6 md:mt-0">
              <h2 className="text-xl font-bold text-emerald-700">Your Chats</h2>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-rose-600 hover:text-rose-700 text-sm font-medium transition"
              >
                Sign Out
              </button>
            </div>
            <div
              className="flex flex-col gap-2 mt-4 overflow-y-auto"
              style={{ flex: 1, minHeight: 0 }}
            >
              {allChats.length > 0 &&
                allChats.map((session, index) => (
                  <div key={index} className="flex items-center gap-2 mb-1">
                    <button
                      className={`w-full px-3 py-2 rounded-lg text-left border border-emerald-100 hover:bg-emerald-100 transition ${
                        currenChatId === session.id
                          ? "bg-emerald-200 font-bold"
                          : ""
                      }`}
                      type="button"
                      onClick={() => {
                        setCurrentChatId(session.id);
                        openChat(session.id);
                        setSidebarOpen(false);
                      }}
                    >
                      {session.title || `Chat ${index + 1}`}
                    </button>
                    {/* <div className="relative group">
                      <button
                        disabled
                        className="text-rose-400 hover:text-rose-500 cursor-not-allowed px-2 py-1 rounded"
                        tabIndex={-1}
                      >
                        Delete
                      </button>
                      <span className="absolute left-1/2 -translate-x-1/2 right-0 min-w-[8rem] mt-1 px-2 py-1 text-xs bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
                        Next release 🚀
                      </span>
                    </div> */}
                  </div>
                ))}
            </div>
            {/* upcoming release: 
            <button
              onClick={addNewChat}
              className="w-full py-2 bg-emerald-400 text-white rounded-lg font-semibold transition relative group"
            >
              + New Chat
              <span className="absolute left-1/2 -translate-x-1/2 mt-10 w-max px-2 py-1 text-xs bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
                Next release 🚀
              </span>
            </button> */}
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4 flex items-center justify-between px-2">
              <div>
                <p className="text-emerald-600 mt-1 text-sm">
                  Welcome to your chat dashboard
                </p>
              </div>

              <div className="flex items-center gap-3">
                {resume && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-4 rounded text-xs max-w-[120px] truncate">
                    {shortenFileName(resume.name)}
                  </span>
                )}
                {!resume &&
                  sessionResumes[currenChatId] &&
                  sessionResumes[currenChatId].filename.length > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-4 rounded text-xs ">
                      {shortenFileName(sessionResumes[currenChatId].filename)}
                    </span>
                  )}

                <label className="px-3 py-2 bg-amber-200 text-emerald-800 rounded cursor-pointer hover:bg-amber-300 font-medium shadow-sm ml-2 flex items-center gap-2">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      setResume(e.target.files[0]);
                    }}
                    key={fileInputKey + currenChatId}
                  />
                  <span>
                    {resume ||
                    (sessionResumes[currenChatId] &&
                      sessionResumes[currenChatId].summary.length > 0)
                      ? "Reselect"
                      : session?.user?.profileType === "recruiter"
                      ? "Share JD"
                      : "Upload Resume"}
                  </span>
                </label>

                {resume && (
                  <button
                    onClick={(e) => handleUpload(e, "clean")}
                    className="px-3 py-2 bg-emerald-400 text-white rounded hover:bg-emerald-500 transition"
                  >
                    Submit
                  </button>
                )}
                {sessionResumes[currenChatId] &&
                  sessionResumes[currenChatId].summary.length > 0 && (
                    <button
                      onClick={(e) => handleDelete(e)}
                      className="px-3 py-2 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition"
                    >
                      Delete
                    </button>
                  )}
                <button
                  className="ml-2 px-3 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                  onClick={() => {
                    findMatches();
                    setShowMatches(true);
                  }}
                >
                  Find Matches
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 h-104 overflow-y-auto bg-amber-50 rounded-lg p-4 mb-4 border border-rose-100">
              {messages.length === 0 && (
                <div className="text-rose-300 text-center my-auto">
                  Start a conversation or select a chat to view messages.
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg max-w-xs break-words shadow ${
                      m.role === "user"
                        ? "bg-emerald-300 text-white"
                        : "bg-white border border-amber-100 text-gray-800"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
              {messageLoading && (
                <div
                  className={`px-4 py-2 rounded-lg max-w-xs break-words shadow bg-white border border-amber-100 text-gray-800`}
                >
                  {"AI is typing......"}
                </div>
              )}
              <div ref={endOfMessagesRef}></div>
            </div>
            <form
              className="flex gap-2 mt-auto"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white shadow-sm"
              />
              <button
                type="submit"
                className="bg-emerald-400 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
        {showMatches && (
          <div className="fixed top-0 right-0 h-full w-full max-w-xs bg-emerald-50 shadow-lg z-50 flex flex-col border-l border-emerald-200 transition-all">
            <div className="flex justify-between items-center p-4 border-b border-emerald-100">
              <h2 className="text-xl font-bold text-emerald-700">Matches</h2>
              <button
                className="text-rose-500 text-2xl font-bold p-2 bg-white rounded-lg"
                onClick={() => setShowMatches(false)}
                aria-label="Close matches"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {!matchesLoading &&
                matches.length > 0 &&
                matches.map((item, index) => {
                  return (
                    <MatchCard
                      key={index}
                      title={item.name}
                      subtitle={item.matchingReason}
                      details={item.chatSummary}
                    />
                  );
                })}
              {matchesLoading && (
                <Loader loadingMessage={"Finding matches for you !!!"} />
              )}
            </div>
          </div>
        )}
        {!showMatches && (
          <button
            className="fixed top-1/2 right-2 z-40 bg-emerald-400 text-white rounded-full p-3 shadow-lg hover:bg-emerald-500 transition"
            style={{ transform: "translateY(-50%)" }}
            onClick={() => setShowMatches(true)}
            aria-label="Open matches drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
