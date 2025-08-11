"use client";
import { useEffect, useState } from "react";
import MatchCard from "./MatchCard";
import ConnectionCard from "./ConnectionCard";
export default function RighPanel({
  type,
  detailsObject = {},
  session,
  currentChatId,
  toggleRightPanel,
  matches = [],
  connections = [],
  openDetailsPanel,
}) {

  return (
    <div className="w-full h-full bg-white border-l border-slate-300 p-6 flex flex-col">
      <button
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800 transition-colors"
        onClick={() => toggleRightPanel()}
      >
        X
      </button>
      <div className="flex-1 overflow-y-auto mt-8">
        {type === 1 && (
          <div>
            <p className="font-bold text-2xl">Relavant Matches:</p>
            {matches.length === 0 && <p>Nothing found..</p>}
            {matches.length > 0 &&
              matches.map((item, index) => (
                <div key={index} className="mb-4">
                  <MatchCard
                    type={1}
                    matchPercentage={item.matchPercentage}
                    matchingReason={item.matchingReason}
                    mismatchReason={item.mismatchReason}
                    profileType={session?.user?.profileType}
                    senderSession={currentChatId}
                    matchedUserId={item.matchedUserId}
                    matchedSessionId={item.matchedSessionId}
                    contacted={item.contacted}
                    matchedUserName={item.matchedUserName}
                    matchedUserEmail={item.matchedUserEmail}
                    title={item.title}
                    description={item.chatSummary}
                    openDetailsPanel={(type, dataObject) => {
                      // Pass the complete match data for details view
                      const detailsData = {
                        matchedUserName: item.matchedUserName,
                        matchedUserEmail: item.matchedUserEmail,
                        matchPercentage: item.matchPercentage,
                        description: item.chatSummary,
                        matchingReason: item.matchingReason,
                        mismatchReason: item.mismatchReason,
                      };
                      openDetailsPanel(3, detailsData);
                    }}
                  />
                </div>
              ))}
          </div>
        )}
        {type === 2 && (
          <div>
            <p className="font-bold text-2xl">Connection Requests:</p>
            {connections.length === 0 && <p>Nothing found..</p>}
            {connections.length > 0 &&
              connections.map((item, index) => (
                <div key={index} className="mb-4">
                  <ConnectionCard
                    emailSent={item.emailSent}
                    message={item.message}
                    createdAt={item.createdAt}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
      {type === 3 && detailsObject && (
        <div className="flex flex-col gap-3 mt-4 p-4 bg-gray-50 rounded-lg shadow-inner border overflow-y-auto scrollbar-none">
          {/* 1. Name (hashed) and Match Percentage */}
          <div className="border-b border-gray-200 pb-2">
            {detailsObject.matchedUserName && (
              <div className="text-sm font-medium text-blue-600 mb-1">
                👤 {detailsObject.matchedUserName}
              </div>
            )}
            {detailsObject.matchedUserEmail && (
              <div className="text-xs text-gray-600 mb-2">
                📧 {detailsObject.matchedUserEmail}
              </div>
            )}
            <div>
              <span className="font-bold text-emerald-700 text-xl">
                {detailsObject.matchPercentage || "-"}
              </span>
              <span className="ml-2 text-xs text-gray-500 align-middle">
                Match Percentage
              </span>
            </div>
          </div>

          {/* 2. Description */}
          {detailsObject.description && (
            <div>
              <span className="font-semibold text-gray-700">Description:</span>
              <div className="text-gray-700 text-sm mt-1">
                {detailsObject.description}
              </div>
            </div>
          )}

          {/* 3. Reason for Match */}
          {detailsObject.matchingReason && (
            <div>
              <span className="font-semibold text-gray-700">
                Reason for Match:
              </span>
              <div className="text-green-700 text-sm mt-1">
                {detailsObject.matchingReason}
              </div>
            </div>
          )}

          {/* 4. Reason for Mismatch */}
          {detailsObject.mismatchReason && (
            <div>
              <span className="font-semibold text-gray-700">
                Reason for Mismatch:
              </span>
              <div className="text-red-500 text-sm mt-1">
                {detailsObject.mismatchReason}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
