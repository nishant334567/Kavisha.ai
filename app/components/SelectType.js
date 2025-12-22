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
  useEffect(() => {}, [showType]);
  const typeOfConnection = [
    {
      name: "job_seeker",
      title: "I am looking for work",
      initialMessage:
        "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can done. :)",
    },
    {
      name: "recruiter",
      title: "I am looking at hiring",
      initialMessage:
        "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can done. :)",
    },
    {
      name: "friends",
      title: "I am looking for a friend",
      initialMessage:
        "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can done. :)",
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
              Why do you want to connect with my community?
            </p>
            {typeOfConnection.map((item) => (
              <button
                key={item.name}
                onClick={() =>
                  selectChatType(item.name, item.initialMessage, true)
                }
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
                  <span className="text-sm font-medium">
                    Connect with the community
                  </span>
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
