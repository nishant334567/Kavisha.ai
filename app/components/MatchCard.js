"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

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
  const { user } = useFirebaseSession();

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
            onClick={() => openChatSession(user?.id, matchedUserId)}
            className="w-full px-2 py-1 rounded-md flex items-center justify-center 
            bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            <span className="text-white text-sm mr-2">Chat Now</span>
            <MessageSquare className="w-4 h-4" />
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
