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
      title: "Looking for work",
      initialMessage:
        "Hello! Looking for a job? Beautiful! Tell me all about it and we'll see what can done. :)",
    },
    {
      name: "recruiter",
      title: "Looking at hiring",
      initialMessage:
        "Hello! Looking at hiring somebody? Beautiful! Tell me all about it and we'll see what can done. :)",
    },
    {
      name: "friends",
      title: "Looking for a friend",
      initialMessage:
        "Hello! Looking to connect with a friend? Beautiful! Tell me all about it and we'll see what can done. :)",
    },
  ];
  const base =
    "text-slate-600 uppercase font-extralight font-akshar group relative px-6 py-3 text-center transition-all duration-200  hover:font-semibold w-full flex items-center justify-center";

  // const cls = (item) =>
  //   selectedType === item.name ? "font-semibold" : "font-medium";

  return (
    <div className="flex items-center justify-center px-4 h-full min-h-screen">
      <div className="flex flex-col gap-3 w-full max-w-md">
        {showType && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowtype(false)}
              className="mb-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-start gap-2 self-start"
            >
              ← Go Back
            </button>
            <p className="text-lg font-medium mb-4 font-akshar uppercase text-center text-slate-700">
              Why do you want to connect with my community?
            </p>
            {typeOfConnection.map((item) => (
              <button
                key={item.name}
                onClick={() =>
                  selectChatType(item.name, item.initialMessage, true)
                }
                className={`${base} `}
                disabled={isCreating}
              >
                {item.title}
              </button>
            ))}
          </div>
        )}
        {!showType && (
          <div className="px-4">
            {servicesProvided.length > 0 &&
              servicesProvided.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col justify-center items-center"
                >
                  <button
                    onClick={() => {
                      !isCreating &&
                        selectChatType(item.name, item.initialMessage);
                    }}
                    className="font-akshar uppercase text-lg flex items-center justify-center w-full"
                    disabled={isCreating}
                  >
                    {isCreating && selectedType === item.name ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="inline-block h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
                        <span className="font-akshar uppercase text-lg">
                          Starting…
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="font-akshar uppercase text-l font-light">
                          {item.title || item.name}
                        </span>
                      </div>
                    )}
                  </button>
                  <div className="h-[0.5px] w-[40px] mx-auto bg-slate-400 my-4"></div>
                </div>
              ))}
            {enableCommunityOnboarding && (
              <button
                onClick={() => setShowtype(true)}
                className="flex items-center justify-center w-full"
                disabled={isCreating}
              >
                <div className="flex items-center justify-center">
                  <span className="font-akshar uppercase text-lg font-light">
                    Connect with other fans
                  </span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
