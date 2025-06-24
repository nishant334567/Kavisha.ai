"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isJobSeeker, setIsJobSeeker] = useState(true);
  const [profile, setProfile] = useState({});
  const { data: session, status } = useSession();
  console.log(session);

  // Add initial welcome message based on mode
  useEffect(() => {
    const welcomeMessage = {
      role: "assistant",
      text: isJobSeeker
        ? "Hi I am Kavisha — a smart, emotionally intelligent AI recruiter. "
        : "Hi I am Kavisha — a helpful recruiter assisting a company or hiring manager.",
    };
    setMessages([welcomeMessage]);
  }, [isJobSeeker]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const newUserMessage = { role: "user", text: input };
    const userText = input;
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");

    const response = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({
        history: messages,
        userMessage: userText,
        jobseeker: isJobSeeker,
      }),
    });

    if (!response.ok) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          text: "Error: Could not get response from Open AI",
        },
      ]);
      return;
    }

    const data = await response.json();
    console.log("data", data);
    setMessages([...updatedMessages, { role: "assistant", text: data.reply }]);
    setProfile((prev) => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(data.parsedData || {}).filter(([_, v]) => v !== null)
      ),
    }));
  };
  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 py-6 px-4 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt="User Avatar"
                className="w-14 h-14 rounded-full border"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Hi {session?.user?.name}
              </h1>
              <p className="text-sm text-gray-600">
                {isJobSeeker
                  ? "Let's find your dream job!"
                  : "Let's find the perfect candidate!"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => {
                setIsJobSeeker((prev) => !prev);
                setMessages([]);
                setInput("");
                setProfile({});
              }}
            >
              Switch Mode
            </button>
            <button onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl rounded-lg shadow-2xl p-4 mt-4">
        <div className="h-96 overflow-y-scroll">
          {messages.map((m, i) => {
            return (
              <div
                key={i}
                className={`my-2 ${
                  m.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded ${
                    m.role === "user" ? "bg-blue-100" : "bg-gray-200"
                  }`}
                >
                  {m.text}
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
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
        {isJobSeeker
          ? (profile?.current_role ||
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
                {profile?.current_role && (
                  <p>Current Role: {profile.current_role}</p>
                )}
                {profile?.desired_role && (
                  <p>Desired Role: {profile.desired_role}</p>
                )}
                {profile?.education && <p>Education: {profile.education}</p>}
                {profile?.current_ctc && (
                  <p>Current Salary: {profile.current_ctc}</p>
                )}
                {profile?.expected_ctc && (
                  <p>Expected Salary: {profile.expected_ctc}</p>
                )}
                {profile?.location_preference && (
                  <p>Location Preference: {profile.location_preference}</p>
                )}
                {profile?.current_location && (
                  <p>Company Type: {profile.current_location}</p>
                )}
                {profile?.company_type && (
                  <p>Company Type: {profile.company_type}</p>
                )}
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
            )
          : (profile?.role_title ||
              profile?.experience_required ||
              profile?.salary_range ||
              profile?.location ||
              profile?.location_flexibility ||
              profile?.work_mode ||
              profile?.urgency ||
              profile?.attrition_reason ||
              profile?.temperament ||
              profile?.jd_summary ||
              profile?.no_of_openings) && (
              <div className="space-y-1 text-sm mt-2">
                <p className="font-bold">Recruiter Requirements: </p>
                {profile?.role_title && <p>Role Title: {profile.role_title}</p>}
                {profile?.experience_required && (
                  <p>Experience Required: {profile.experience_required}</p>
                )}
                {profile?.no_of_openings && (
                  <p>Open Positions: {profile.no_of_openings}</p>
                )}
                {profile?.salary_range && (
                  <p>Salary Range: {profile.salary_range}</p>
                )}
                {profile?.location && <p>Location: {profile.location}</p>}
                {profile?.location_flexibility && (
                  <p>Location Flexibility: {profile.location_flexibility}</p>
                )}
                {profile?.work_mode && <p>Work Mode: {profile.work_mode}</p>}
                {profile?.urgency && <p>Urgency: {profile.urgency}</p>}
                {profile?.attrition_reason && (
                  <p>Attrition Reason: {profile.attrition_reason}</p>
                )}
                {profile?.temperament && (
                  <p>Temperament: {profile.temperament}</p>
                )}
                {profile?.jd_summary && (
                  <p>Job Summary: {profile.jd_summary}</p>
                )}
              </div>
            )}
      </div>
    </>
  );
}
