"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function ChatmessagesPage({ params }) {
  const { data: session } = useSession();
  const { chatid } = useParams();
  const [messages, setmessages] = useState([]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState({});
  useEffect(() => {
    const fetchmessages = async () => {
      const res = await fetch(`/api/ai?sessionId=${chatid}`);
      const data = await res.json();
      setmessages(data.logs || []);
    };

    fetchmessages();
  }, [chatid]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: "user", message: input };
    const userText = input;
    const updatedMessages = [...messages, newUserMessage];
    setmessages(updatedMessages);
    setInput("");
    console.log(session);
    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        history: messages,
        userMessage: userText,
        jobseeker: session?.user?.profileType,
        sessionId: chatid,
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
    console.log("data", data);
    setmessages([
      ...updatedMessages,
      { role: "assistant", message: data.reply },
    ]);
    setProfile((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(data.parsedData || {}).filter(([_, v]) => v !== null)
      ),
    }));
  };
  return (
    <div>
      <div className="mx-auto max-w-xl rounded-lg shadow-2xl p-4 mt-4">
        <div className="h-96 overflow-y-scroll">
          {messages.map((m, i) => {
            return (
              <div
                key={i}
                className={`my-2 ${
                  m.role === "user" ? "message-right" : "message-left"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded ${
                    m.role === "user" ? "bg-blue-100" : "bg-gray-200"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
          />
          <button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 message-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </div>
      {(profile?.current_role ||
        profile?.desired_role ||
        profile?.current_ctc ||
        profile?.expected_ctc ||
        profile?.location_preference ||
        profile?.company_type ||
        profile?.education ||
        profile?.work_mode ||
        profile?.experience != null) && (
        <div className="p-2">
          <p className="font-bold">Profile Info: </p>
          {profile?.current_role && <p>Current Role: {profile.current_role}</p>}
          {profile?.desired_role && <p>Desired Role: {profile.desired_role}</p>}
          {profile?.education && <p>Education: {profile.education}</p>}
          {profile?.current_ctc && <p>Current Salary: {profile.current_ctc}</p>}
          {profile?.expected_ctc && (
            <p>Expected Salary: {profile.expected_ctc}</p>
          )}
          {profile?.location_preference && (
            <p>Location Preference: {profile.location_preference}</p>
          )}
          {profile?.current_location && (
            <p>Company Type: {profile.current_location}</p>
          )}
          {profile?.company_type && <p>Company Type: {profile.company_type}</p>}
          {profile?.notice_period && (
            <p>Notice Period: {profile.notice_period}</p>
          )}
          {profile?.work_mode && <p>Mode: {profile.work_mode}</p>}
          {profile?.experience != null && (
            <p>Experience: {profile.experience}</p>
          )}
          {profile?.tech_stack?.length > 0 && (
            <div className="flex gap-2">
              <p>Tech Stack: </p>
              {profile.tech_stack.map((item, index) => {
                return <p key={index}>{item}</p>;
              })}
            </div>
          )}
          {profile?.growth_preference && (
            <p>Company Type: {profile.growth_preference}</p>
          )}
        </div>
      )}
    </div>
  );
}
