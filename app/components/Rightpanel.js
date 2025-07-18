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
}) {
  // const [dataArray, setDataArray] = useState([]);
  // useEffect(() => {
  //   if (type === 1) {
  //     const fetchMatches = async () => {
  //       const response = await fetch(`/api/fetch-matches/${currentChatId}`);
  //       const data = await response.json();

  //       setDataArray(data.matches);
  //     };
  //     fetchMatches();
  //   }
  //   if (type === 2) {
  //     const fetchConnections = async () => {
  //       const response = await fetch(`/api/connections/${currentChatId}`);
  //       const data = await response.json();

  //       setDataArray(data.connections);
  //     };
  //     fetchConnections();
  //   }
  // }, []);
  return (
    <div className="fixed top-24 right-8 w-[350px] max-h-screen bg-white border border-gray-300 rounded-xl shadow-2xl p-6 z-50 flex flex-col">
      <button
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-black shadow transition"
        onClick={() => toggleRightPanel()}
      >
        X
      </button>
      <div className="scrollbar-none flex-1 overflow-y-auto">
        {matches.length === 0 &&
          connections.length === 0 &&
          (type === 1 || type === 2) && <p>Nothing found..</p>}
        {/* Cards yahan render karo */}
        {type === 1 &&
          matches.length > 0 &&
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
              />
            </div>
          ))}
        {type === 2 &&
          connections.length > 0 &&
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
      {type === 3 && detailsObject && (
        <div className="flex flex-col gap-3 mt-4 p-4 bg-gray-50 rounded-lg shadow-inner border">
          <div>
            <span className="font-bold text-emerald-700 text-xl">
              {detailsObject.matchPercentage || "-"}
            </span>
            <span className="ml-2 text-xs text-gray-500 align-middle">
              Match Percentage
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Reason:</span>
            <div className="text-gray-700">{detailsObject.matchingReason}</div>
          </div>
          <div>
            <span className="font-semibold text-gray-700">Mismatch:</span>
            <div className="text-red-500">{detailsObject.mismatchReason}</div>
          </div>
        </div>
      )}
    </div>
  );
}
