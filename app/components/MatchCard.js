"use client";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

export default function MatchCard({
  type = 0,
  matchTitle,
  description,
  matchPercentage,
  matchingReason,
  mismatchReason,
  contacted,
  createdAt,
  profileType,
  matchedUserId,
  matchedSessionId,
  matchedUserName,
  matchedUserEmail,
  senderSession,
  openDetailsPanel,
  openChatSession,
}) {
  const { data: session } = useSession();
  const [latestCredits, setLatestCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [alreadyContacted, setAlreadyContacted] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/credits/${session.user.id}`);
        if (!response.ok) {
          console.error("Failed to fetch credits");
          return;
        }
        const data = await response.json();
        setLatestCredits(data.credits || 0);
      } catch (error) {
        console.error("Error fetching credits:", error);
      }
    };

    fetchCredits();
    setAlreadyContacted(contacted);
    (contacted, alreadyContacted, "logs for contacts");
  }, [session?.user?.id]);

  const createConnection = async () => {
    // if (latestCredits <= 0 && profileType === "recruiter") {
    //   alert("No credits remaining. Please add more credits to connect.");
    //   return;
    // }

    setIsLoading(true);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverId: matchedUserId,
          receiverSession: matchedSessionId,
          senderId: session?.user?.id,
          senderProfileType: session?.user?.profileType,
          senderSession: senderSession,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Connection request sent successfully!");
        setAlreadyContacted(true);
        // Refresh credits after successful connection
        const creditsResponse = await fetch(`/api/credits/${session.user.id}`);
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setLatestCredits(creditsData.credits || 0);
        }
      } else {
        if (data.message === "Connection request already sent") {
          setAlreadyContacted(true);
        }
        alert(
          data.message || data.error || "Failed to send connection request"
        );
      }
    } catch (error) {
      console.error("Error creating connection:", error);
      alert("Failed to send connection request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative g-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 min-h-[120px] w-full relative">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">
          Match: {matchPercentage || "-"}
        </span>
      </div>
      {matchedUserName && (
        <div className="text-xs text-blue-600 font-medium">
          👤 {matchedUserName}
        </div>
      )}
      {matchedUserEmail && (
        <div className="text-xs text-gray-600">📧 {matchedUserEmail}</div>
      )}
      {matchTitle && (
        <div className="text-xs text-green-700 font-medium">{matchTitle}</div>
      )}
      {matchingReason && (
        <div className="text-xs text-green-700 font-medium">
          {matchingReason.length > 150 && type != 1
            ? matchingReason.slice(0, 150) + "..."
            : matchingReason}
        </div>
      )}
      {mismatchReason && (
        <div className="text-xs text-red-600">
          Mismatch:{" "}
          {mismatchReason.length > 150 && type != 1
            ? mismatchReason.slice(0, 150) + "..."
            : mismatchReason}
        </div>
      )}
      {createdAt && (
        <div className="text-[10px] text-slate-500 mt-1">
          Matched on: {new Date(createdAt).toLocaleDateString()}
        </div>
      )}
      <div className="flex text-xs gap-2">
        <div className="w-full relative">
          <button
            onClick={() =>
              openChatSession(
                senderSession,
                matchedSessionId,
                session?.user?.id,
                matchedUserId
              )
            }
            className="w-full px-2 py-1 rounded-md flex items-center justify-center 
            bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            <span className="text-white text-sm mr-2">Chat Now</span>
            <img src="chat.png" width={15} height={15} />
          </button>
        </div>
        {type != 1 && (
          <button
            onClick={() =>
              openDetailsPanel(3, {
                matchedUserName: matchedUserName,
                matchedUserEmail: matchedUserEmail,
                matchPercentage,
                description,
                matchingReason,
                mismatchReason,
              })
            }
            className="w-full px-2 py-1 border-2 bg-white text-gray-600 rounded-md hover:bg-gray-50"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
