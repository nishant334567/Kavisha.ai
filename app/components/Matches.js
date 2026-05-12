"use client";
import { useRef } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import CommunityCard from "./CommunityCard";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useBrandContext } from "../context/brand/BrandContextProvider";
import {
  normalizeBrandHex,
  getEffectiveCommunityPrimaryColorStr,
  getEffectiveCommunitySecondaryColorStr,
} from "../lib/brandTheme";
import { maskCommunityPeerName } from "../lib/communityPeerDisplayName";

function formatLastSynced(ts) {
  if (ts == null || Number.isNaN(Number(ts))) return null;
  try {
    return new Date(Number(ts)).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

export default function Matches({
  currentChatId,
  matches,
  handleConnect,
  paidConnectedUserIds,
  onRefresh,
  lastSyncedAt,
  refreshing = false,
}) {
  const { user } = useFirebaseSession();
  const brandContext = useBrandContext();
  const primaryHex = normalizeBrandHex(
    getEffectiveCommunityPrimaryColorStr(brandContext),
  );
  const secondaryHex = normalizeBrandHex(
    getEffectiveCommunitySecondaryColorStr(brandContext),
  );

  const scrollRef = useRef();

  const scrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const lastSyncedLabel = formatLastSynced(lastSyncedAt);

  return (
    <div className="relative mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold ${!primaryHex ? "text-foreground" : ""}`}
            style={primaryHex ? { color: primaryHex } : undefined}
          >
            Eligible Matches
          </p>
          {lastSyncedLabel && (
            <p className="text-xs text-muted mt-1">
              Last refreshed: {lastSyncedLabel}
            </p>
          )}
        </div>
        {typeof onRefresh === "function" && (
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={refreshing}
            style={primaryHex ? { borderColor: primaryHex, color: primaryHex } : undefined}
            className="inline-flex items-center gap-2 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-border bg-card text-foreground"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            {refreshing ? "Refreshing…" : "Refresh matches"}
          </button>
        )}
      </div>

      {matches.length === 0 && !refreshing && (
        <p className="text-sm text-muted mb-4">
          No matches yet. Tap refresh to run matching again.
        </p>
      )}

      {matches.length > 0 && (
        <div className="relative">
            <div className="absolute top-1/3 -left-4 z-10">
              <button
                type="button"
                className="bg-card rounded-full p-2 shadow-md hover:bg-muted-bg border border-border transition-colors"
                style={
                  primaryHex
                    ? { borderColor: primaryHex, color: primaryHex }
                    : undefined
                }
                onClick={() => scrollBy(-200)}
              >
                <ChevronLeft size={24} className={primaryHex ? "" : "text-foreground"} />
              </button>
            </div>
            <div
              ref={scrollRef}
              className="w-full max-w-full min-h-[220px] overflow-x-auto flex gap-4 scroll-smooth scrollbar-none items-stretch"
            >
              {matches.map((item, index) => {
                const matchedId = item.matchedUserId;
                const sid =
                  item.matchedSessionId === currentChatId
                    ? item.sessionId
                    : item.matchedSessionId;
                const key =
                  sid != null ? `match-${String(sid)}` : `match-${index}`;
                const rawPeerName =
                  String(item.matchedUserName || "").trim() ||
                  String(item.title || "").trim();
                const displayName = maskCommunityPeerName(rawPeerName);
                const alreadyPaid =
                  matchedId != null &&
                  paidConnectedUserIds?.has?.(String(matchedId));
                return (
                  <div
                    key={key}
                    className="w-[min(100%,22rem)] flex-shrink-0 sm:w-[24rem] lg:w-[26rem] h-full min-h-0 flex"
                  >
                    <CommunityCard
                      name={displayName}
                      description={String(item.chatSummary || "").trim()}
                      date=""
                      requirement={
                        String(item.title || "").trim() || "Community match"
                      }
                      onConnect={() =>
                        handleConnect?.(user?.id, matchedId, displayName)
                      }
                      connectLabel={alreadyPaid ? "Message" : "Connect"}
                      isOwnPost={false}
                      showLookingForPill={false}
                      primaryBrandColor={primaryHex}
                      secondaryBrandColor={secondaryHex}
                    />
                  </div>
                );
              })}
            </div>
            <div className="absolute top-1/3 -right-4 z-10">
              <button
                type="button"
                className="bg-card rounded-full p-2 shadow-md hover:bg-muted-bg border border-border transition-colors"
                style={
                  primaryHex
                    ? { borderColor: primaryHex, color: primaryHex }
                    : undefined
                }
                onClick={() => scrollBy(200)}
              >
                <ChevronRight size={24} className={primaryHex ? "" : "text-foreground"} />
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
