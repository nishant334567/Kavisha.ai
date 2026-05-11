"use client";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import { MessageSquare } from "lucide-react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import {
  normalizeBrandHex,
  hexToRgba,
  getEffectiveCommunityPrimaryColorStr,
  getEffectiveCommunitySecondaryColorStr,
} from "../lib/brandTheme";

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
  // openDetailsPanel,
  openChatSession,
}) {
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const primaryHex = normalizeBrandHex(
    getEffectiveCommunityPrimaryColorStr(brandContext),
  );
  const secondaryHex = normalizeBrandHex(
    getEffectiveCommunitySecondaryColorStr(brandContext),
  );
  const accentText = secondaryHex || primaryHex;

  const cardSurfaceStyle =
    primaryHex != null
      ? {
          borderLeftWidth: 4,
          borderLeftColor: primaryHex,
          backgroundColor: hexToRgba(primaryHex, 0.08),
        }
      : undefined;

  return (
    <div
      className="relative rounded-lg border border-border bg-card p-4 flex flex-col gap-2 min-h-[120px] w-full"
      style={cardSurfaceStyle}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-semibold text-sm text-foreground"
          style={primaryHex ? { color: primaryHex } : undefined}
        >
          Match: {matchPercentage || "-"}
        </span>
      </div>
      {matchedUserName && (
        <div
          className={`text-xs font-medium ${!accentText ? "text-highlight" : ""}`}
          style={accentText ? { color: accentText } : undefined}
        >
          👤 {matchedUserName}
        </div>
      )}
      {matchedUserEmail && (
        <div className="text-xs text-muted">📧 {matchedUserEmail}</div>
      )}
      {matchTitle && (
        <div
          className={`text-xs font-medium ${!accentText ? "text-highlight" : ""}`}
          style={accentText ? { color: accentText } : undefined}
        >
          {matchTitle}
        </div>
      )}
      {matchingReason && (
        <div
          className={`text-xs font-medium ${!accentText ? "text-highlight" : ""}`}
          style={accentText ? { color: accentText } : undefined}
        >
          {matchingReason.length > 150 && type != 1
            ? matchingReason.slice(0, 150) + "..."
            : matchingReason}
        </div>
      )}
      {mismatchReason && (
        <div className="text-xs text-red-600 dark:text-red-400">
          Mismatch:{" "}
          {mismatchReason.length > 150 && type != 1
            ? mismatchReason.slice(0, 150) + "..."
            : mismatchReason}
        </div>
      )}
      {createdAt && (
        <div className="text-[10px] text-muted mt-1">
          Matched on: {new Date(createdAt).toLocaleDateString()}
        </div>
      )}
      <div className="flex text-xs gap-2">
        <div className="w-full relative">
          <button
            type="button"
            onClick={() => openChatSession(user?.id, matchedUserId)}
            style={primaryHex ? { backgroundColor: primaryHex } : undefined}
            className={`w-full px-2 py-1 rounded-md flex items-center justify-center text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50 ${
              !primaryHex ? "bg-highlight" : ""
            }`}
          >
            <span className="mr-2">Chat Now</span>
            <MessageSquare className="w-4 h-4 shrink-0" aria-hidden />
          </button>
        </div>
        {/* {type != 1 && (
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
            className="w-full px-2 py-1 border-2 bg-card text-foreground rounded-md hover:bg-muted-bg border-border"
          >
            View Details
          </button>
        )} */}
      </div>
    </div>
  );
}
