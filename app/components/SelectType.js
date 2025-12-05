"use client";
import { useEffect, useState } from "react";

export default function SelectChatType({
  servicesProvided,
  selectedType,
  selectChatType,
  isCreating,
  enableCommunityOnboarding = false,
}) {
  const [showType, setShowtype] = useState(false);
  useEffect(() => {
    console.log("Show Type: ", showType);
  }, [showType]);
  const typeOfConnection = [
    {
      name: "job_seeker",
      title: "Looking for a job?",
      initialMessage:
        "Hello! Looking for your next job or just career advice? Beautiful! Tell me all about it and I’ll help you find the perfect opportunity. :)",
    },
    {
      name: "recruiter",
      title: "Are you hiring?",
      initialMessage:
        "Hello! Are you looking at hiring people? Great! Tell me exactly what you’re looking for, and I’ll find you the perfect candidate. :)",
    },
    {
      name: "friends",
      title: "Looking for a friend?",
      initialMessage:
        "Hello! Looking for a friend, date, relationship, or something like that? Great! Tell me what you want and I’ll help you find your perfect match. :)",
    },
  ];
  const base =
    "group relative px-6 py-3 text-center rounded-lg border transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed w-full";

  const cls = (item) =>
    selectedType === item.name
      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400";

  return (
    <div className="flex items-center justify-center px-4 h-full min-h-screen">
      <div className="flex flex-col gap-3 w-full max-w-md">
        {showType && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowtype(false)}
              className="mb-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              ← Go Back
            </button>
            <p className="text-lg font-semibold mb-4">
              Why do you want to join our community?
            </p>
            {typeOfConnection.map((item) => (
              <button
                key={item.name}
                onClick={() => selectChatType(item.name, item.initialMessage)}
                className={`${base} ${cls(item)}`}
                disabled={isCreating}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
        {!showType && (
          <>
            {servicesProvided.length > 0 &&
              servicesProvided.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    !isCreating &&
                      selectChatType(item.name, item.initialMessage);
                  }}
                  className={`${base} ${cls(item)}`}
                  disabled={isCreating}
                >
                  {isCreating && selectedType === item.name ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3">
                      <span className="inline-block h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                      <span className="text-sm font-semibold">Starting…</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {item.title || item.name}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            {enableCommunityOnboarding && (
              <button
                onClick={() => setShowtype(true)}
                className={`${base} ${cls({ name: "join_community" })}`}
                disabled={isCreating}
              >
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium">Join Community</span>
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
