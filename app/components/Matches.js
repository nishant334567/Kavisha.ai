"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import MatchCard from "./MatchCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Matches({ currentChatId, matches, openDetailsPanel }) {
  const { data: session } = useSession();

  const scrollRef = useRef();

  const scrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative">
      {matches.length > 0 && (
        <div className="mt-8 ">
          {matches.length > 0 && (
            <p className="text-black font-semibold mb-2">Eligible Matches:</p>
          )}
          <div className="relative">
            <div className="absolute top-1/3 -left-4 z-10">
              <button
                className="bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
                onClick={() => scrollBy(-200)}
              >
                <ChevronLeft size={24} color="black" />
              </button>
            </div>
            <div
              ref={scrollRef}
              className="w-full max-w-full min-h-[180px] overflow-x-auto flex gap-3 scroll-smooth scrollbar-none"
            >
              {matches.map((item, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 sm:w-[50%] lg:w-[40%] xl:w-[35%] h-full "
                >
                  <MatchCard
                    contacted={false}
                    matchTitle={item.title}
                    description={item.chatSummary}
                    matchPercentage={item.matchPercentage}
                    matchingReason={item.matchingReason}
                    mismatchReason={item.mismatchReason}
                    profileType={session?.user?.profileType}
                    senderSession={currentChatId}
                    matchedUserId={item.matchedUserId}
                    matchedSessionId={item.matchedSessionId}
                    matchedUserName={item.matchedUserName}
                    matchedUserEmail={item.matchedUserEmail}
                    openDetailsPanel={openDetailsPanel}
                  />
                </div>
              ))}
            </div>
            <div className="absolute top-1/3 -right-4 z-10">
              <button
                className="bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
                onClick={() => scrollBy(200)}
              >
                <ChevronRight size={24} color="black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
