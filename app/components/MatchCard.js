"use client";
import { useSession } from "next-auth/react";
import React, { useEffect } from "react";
export default function MatchCard({
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

  const createConnection = async () => {
    console.log("Checking session value during api call", session);
    const response = await fetch("/api/connections", {
      method: "POST",

      body: JSON.stringify({
        receiverId: matchedUserId,
        receiverSession: matchedSessionId,
        senderId: session?.user?.id,
        senderProfileType: session?.user?.profileType,
        senderSession: senderSession,
      }),
    });
    const data = await response.json();
    console.log("Data from connection API", data);
  };
  return (
    <div className="bg-white border rounded-lg shadow p-4 flex flex-col gap-2 min-h-[120px] w-full">
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
          {matchingReason}
        </div>
      )}
      {mismatchReason && (
        <div className="text-xs text-red-500">Mismatch: {mismatchReason}</div>
      )}
      {createdAt && (
        <div className="text-[10px] text-gray-400 mt-1">
          Matched on: {new Date(createdAt).toLocaleDateString()}
        </div>
      )}
      <div className="flex text-xs gap-2">
        <button
          className="w-full px-2 py-1 text-white bg-gray-600 rounded-md"
          onClick={() => {
            createConnection();
          }}
        >
          {profileType === "recruiter" ? "Connect" : "Apply"}
        </button>
        <button
          onClick={() =>
            openDetailsPanel(3, {
              matchPercentage,
              matchingReason,
              mismatchReason,
            })
          }
          className="w-full px-2 py-1 border-2 bg-white text-gray-600 rounded-md"
        >
          View Details
        </button>
      </div>
      {/* Optionally show IDs for debugging or admin */}
      {/* <div className="text-[10px] text-gray-300">Session: {sessionId}</div>
      <div className="text-[10px] text-gray-300">Matched User: {matchedUserId}</div>
      <div className="text-[10px] text-gray-300">Matched Session: {matchedSessionId}</div> */}
    </div>
  );
}
