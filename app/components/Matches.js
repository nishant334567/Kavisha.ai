"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import MatchCard from "./MatchCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Matches({
  currentChatId,
  matchesincoming,
  openDetailsPanel,
}) {
  const { data: session } = useSession();
  const [matches, setMatches] = useState(matchesincoming || []);
  const scrollRef = useRef();
  useEffect(() => {
    const fetchMatches = async () => {
      const res = await fetch(`/api/fetch-matches/${currentChatId}`);
      const data = await res.json();
      setMatches(data.matches);
    };
    fetchMatches();
  }, [currentChatId]);

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
                    matchPercentage={item.matchPercentage}
                    matchingReason={item.matchingReason}
                    mismatchReason={item.mismatchReason}
                    profileType={session?.user?.profileType}
                    senderSession={currentChatId}
                    matchedUserId={item.matchedUserId}
                    matchedSessionId={item.matchedSessionId}
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
