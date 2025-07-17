"use client";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";

export default function MatchCard({
  type = 0,
  matchPercentage,
  matchingReason,
  mismatchReason,
  contacted,
  createdAt,
  profileType,
  matchedUserId,
  matchedSessionId,
  senderSession,
  openDetailsPanel,
}) {
  const { data: session } = useSession();
  const [latestCredits, setLatestCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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
  }, [session?.user?.id]);

  const createConnection = async () => {
    if (latestCredits <= 0 && profileType === "recruiter") {
      alert("No credits remaining. Please add more credits to connect.");
      return;
    }

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
        // Refresh credits after successful connection
        const creditsResponse = await fetch(`/api/credits/${session.user.id}`);
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setLatestCredits(creditsData.credits || 0);
        }
      } else {
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

  const hasCredits = latestCredits > 0;
  const isRecruiter = profileType === "recruiter";

  return (
    <div className="bg-white border rounded-lg shadow p-4 flex flex-col gap-2 min-h-[120px] w-full relative">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">
          Match: {matchPercentage || "-"}
        </span>
        {contacted !== undefined && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${contacted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
          >
            {contacted ? "Contacted" : "Not Contacted"}
          </span>
        )}
      </div>
      {matchingReason && (
        <div className="text-xs text-emerald-700 font-medium">
          {matchingReason.length > 150 && type != 1
            ? matchingReason.slice(0, 150) + "..."
            : matchingReason}
        </div>
      )}
      {mismatchReason && (
        <div className="text-xs text-red-500">
          Mismatch:{" "}
          {mismatchReason.length > 150 && type != 1
            ? mismatchReason.slice(0, 150) + "..."
            : mismatchReason}
        </div>
      )}
      {createdAt && (
        <div className="text-[10px] text-gray-400 mt-1">
          Matched on: {new Date(createdAt).toLocaleDateString()}
        </div>
      )}
      <div className="flex text-xs gap-2">
        <div className="w-full relative">
          <button
            className={`w-full px-2 py-1 rounded-md flex items-center justify-center ${
              (isRecruiter ? hasCredits : true) && !isLoading
                ? "text-white bg-gray-600 hover:bg-gray-700"
                : "text-gray-400 bg-gray-300 cursor-not-allowed"
            }`}
            onClick={createConnection}
            disabled={(isRecruiter && !hasCredits) || isLoading}
          >
            {isLoading ? (
              "Connecting..."
            ) : isRecruiter ? (
              <>
                <span>Connect ({latestCredits}/3)</span>
                <span
                  className="ml-2 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(!showTooltip);
                  }}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  title="Pricing Information"
                >
                  <span className="text-gray-600 text-xs font-bold">?</span>
                </span>
              </>
            ) : (
              "Apply"
            )}
          </button>

          {showTooltip && isRecruiter && (
            <div className="absolute -top-30 left-0 right-0 bg-gray-300 text-gray-600 text-xs p-2 rounded shadow-lg z-10">
              <div className="text-left">
                <div>1. 3 candidate profiles can be unlocked for free</div>
                <div>2. After free credits: ₹51 per profile</div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          )}
        </div>
        {type != 1 && (
          <button
            onClick={() =>
              openDetailsPanel(3, {
                matchPercentage,
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
      {!hasCredits && isRecruiter && (
        <div className="text-xs text-red-500 text-center">
          No credits remaining. Add credits to connect.
        </div>
      )}
    </div>
  );
}
