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

  const isRecruiter = profileType === "recruiter";
  // Temporarily allow unlimited connections for recruiters (like job seekers)
  const hasCredits = isRecruiter ? true : latestCredits > 0;

  // Function to hash/mask name
  const hashName = (name) => {
    if (!name || name === "Unknown") return "Unknown";
    const parts = name.split(" ");
    return parts
      .map((part) =>
        part.length > 1 ? part[0] + "*".repeat(part.length - 1) : part
      )
      .join(" ");
  };

  // Function to hash/mask email
  const hashEmail = (email) => {
    if (!email || email === "Unknown") return "Unknown";
    const [username, domain] = email.split("@");
    if (!domain) return email;
    const hashedUsername =
      username.length > 2
        ? username.substring(0, 2) + "*".repeat(username.length - 2)
        : username;
    return `${hashedUsername}@${domain}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 min-h-[120px] w-full relative">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 text-sm">
          Match: {matchPercentage || "-"}
        </span>
      </div>
      {matchedUserName && (
        <div className="text-xs text-blue-600 font-medium">
          👤 {hashName(matchedUserName)}
        </div>
      )}
      {matchedUserEmail && (
        <div className="text-xs text-gray-600">
          📧 {hashEmail(matchedUserEmail)}
        </div>
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
            className={`w-full px-2 py-1 rounded-md flex items-center justify-center ${
              isLoading
                ? "text-slate-500 bg-slate-300 cursor-not-allowed"
                : alreadyContacted
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "text-white bg-slate-600 hover:bg-slate-700 transition-colors"
            }`}
            onClick={createConnection}
            disabled={isLoading || alreadyContacted}
          >
            {isLoading ? (
              "Connecting..."
            ) : isRecruiter ? (
              <>
                <span>
                  {alreadyContacted ? "Connected" : "Connect"}
                  {/* ({latestCredits}/3) */}
                </span>
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
            ) : alreadyContacted ? (
              "Applied"
            ) : (
              "Apply"
            )}
          </button>

          {showTooltip && isRecruiter && (
            <div className="absolute -top-30 left-0 right-0 bg-slate-200 text-slate-700 text-xs p-2 rounded shadow-lg z-10">
              <div className="text-left">
                <div>1. 3 candidate profiles can be unlocked for free</div>
                <div>2. After free credits: ₹51 per profile</div>
              </div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-200"></div>
            </div>
          )}
        </div>
        {type != 1 && (
          <button
            onClick={() =>
              openDetailsPanel(3, {
                matchedUserName: hashName(matchedUserName),
                matchedUserEmail: hashEmail(matchedUserEmail),
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
      {/* Temporarily disabled credit limit message for recruiters
      {!hasCredits && isRecruiter && (
        <div className="text-xs text-red-500 text-center">
          No credits remaining. Add credits to connect.
        </div>
      )}
      */}
    </div>
  );
}
