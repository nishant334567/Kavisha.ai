"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useFirebaseSession } from "../lib/firebase/FirebaseSessionProvider";
import useSocket from "../context/useSocket";
import { X, Lock, Unlock } from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { hexToRgba, normalizeBrandHex } from "@/app/lib/brandTheme";

/** Default: cookie session. Pass `widgetAwareFetch` from the embed for Bearer auth. */
async function defaultHttpFetch(input, init) {
  return fetch(input, { ...init, credentials: init?.credentials ?? "include" });
}

export default function Livechat({
  userA,
  userB,
  currentUserId,
  onClose,
  connectionId,
  isEmbedded = false,
  otherUserDisplayName = null,
  /** When set with showMessagingControls, admin can close/reopen user messaging for this thread. */
  messagingBrand = "",
  showMessagingControls = false,
  /** Optional: brand primary used for widget brand inbox styling. */
  primaryColor = null,
  httpFetch = defaultHttpFetch,
}) {
  const [message, setMessage] = useState("");
  const { user } = useFirebaseSession();
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [messagingActionLoading, setMessagingActionLoading] = useState(false);
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenError, setReopenError] = useState("");
  const [chatInfo, setChatInfo] = useState({
    otherUser: "",
    connectionId: null,
    blockedUserId: null,
    sendAllowed: true,
    reopenRequestedAt: null,
  });

  const { socket } = useSocket();

  // Masked name only when opened from community Connect/Message (parent passes otherUserDisplayName)
  const displayName =
    otherUserDisplayName != null && otherUserDisplayName !== ""
      ? otherUserDisplayName
      : chatInfo.otherUser || "";

  const brandKey =
    typeof messagingBrand === "string" && messagingBrand.trim()
      ? messagingBrand.trim().toLowerCase()
      : "";
  const isBrandUserInboxHeader = !showMessagingControls && Boolean(brandKey);
  const headerTitle = isBrandUserInboxHeader
    ? `TEAM ${brandKey.toUpperCase()}`
    : displayName;

  const primaryHex = normalizeBrandHex(primaryColor);
  const shouldUseBrandColors = isEmbedded && Boolean(primaryHex) && Boolean(brandKey);
  const brandHeaderBg =
    shouldUseBrandColors && (hexToRgba(primaryHex, 0.10) || hexToRgba(primaryHex, 0.08))
      ? hexToRgba(primaryHex, 0.10) || hexToRgba(primaryHex, 0.08)
      : null;

  const groupedMessages = useMemo(() => {
    const grouped = {};
    messages.forEach((msg) => {
      // Use createdAt if available, fallback to current date
      const dateKey = msg.createdAt
        ? new Date(msg.createdAt).toDateString()
        : new Date().toDateString();

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });
    return grouped;
  }, [messages]);

  const refreshConnectionMeta = useCallback(async () => {
    const brandKey =
      typeof messagingBrand === "string" && messagingBrand.trim()
        ? messagingBrand.trim().toLowerCase()
        : "";
    const endUserIdFromConnection =
      brandKey && typeof connectionId === "string" && connectionId.startsWith(brandKey + "_")
        ? connectionId.slice((brandKey + "_").length)
        : null;

    const response = await httpFetch(`/api/check-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userA,
        userB,
        connectionId: connectionId,
        currentUserId,
        // Any brand inbox (widget or admin) should upsert with brand_inbox meta so new threads start unblocked.
        ...(brandKey
          ? {
            type: "brand_inbox",
            brand: brandKey,
            // Canonical: connectionId is `${brand}_${endUserId}`.
            // Avoid relying on userA/userB ordering.
            endUserId:
              endUserIdFromConnection ||
              (showMessagingControls ? String(userB) : String(currentUserId)),
          }
          : {}),
      }),
    });
    const data = await response.json();
    if (data.status && data.connectionId) {
      setChatInfo({
        otherUser: data.otherUser,
        connectionId: data.connectionId,
        blockedUserId: data.blockedUserId ?? null,
        sendAllowed: data.sendAllowed !== false,
        reopenRequestedAt: data.reopenRequestedAt ?? null,
      });
    }
  }, [
    userA,
    userB,
    connectionId,
    currentUserId,
    httpFetch,
    messagingBrand,
    showMessagingControls,
  ]);

  useEffect(() => {
    setConnectionLoading(true);
    (async () => {
      try {
        await refreshConnectionMeta();
      } finally {
        setConnectionLoading(false);
      }
    })();
  }, [refreshConnectionMeta]);

  const conversationClosedForUser = Boolean(chatInfo.blockedUserId);
  const isBlockedEndUser = !chatInfo.sendAllowed && !showMessagingControls;
  const hasReopenRequest = Boolean(chatInfo.reopenRequestedAt);

  useEffect(() => {
    if (!socket || !chatInfo.connectionId) return;

    const handleConnect = () => {
      socket.emit("join_room", { connectionId: chatInfo.connectionId });
    };

    const handleHistory = (history) => {
      setMessages(
        (history || []).map((m) => ({
          text: m.text ?? "",
          senderUserId: m.senderUserId,
          senderRole: m.senderRole,
          senderName: m.senderName,
          createdAt: m.createdAt,
        }))
      );
    };

    const handleMessage = (data) => {
      setMessages((prev) => {
        // Check if this message already exists to prevent duplicates
        const messageExists = prev.some(
          (msg) =>
            msg.text === (data?.text ?? "") &&
            msg.senderUserId ===
            (data?.senderUserId ?? data?.senderSessionId ?? "")
        );

        if (messageExists) {
          return prev; // Don't add duplicate
        }

        return [
          ...prev,
          {
            text: data?.text ?? "",
            senderUserId: data?.senderUserId ?? data?.senderSessionId ?? "",
            senderRole: data?.senderRole,
            senderName: data?.senderName,
            createdAt: data?.createdAt || new Date().toISOString(),
          },
        ];
      });
    };

    if (socket && chatInfo.connectionId) {
      if (socket.connected) {
        socket.emit("join_room", {
          connectionId: chatInfo.connectionId,
        });
      } else {
      }

      // socket.off("connect", handleConnect).on("connect", handleConnect);
      socket
        .off("message_history", handleHistory)
        .on("message_history", handleHistory);
      socket
        .off("message_received", handleMessage)
        .on("message_received", handleMessage);

      const handleSendRejected = (payload) => {
        if (payload?.connectionId !== chatInfo.connectionId) return;
        setChatInfo((prev) => ({
          ...prev,
          sendAllowed: false,
          blockedUserId: user?.id ? String(user.id) : prev.blockedUserId,
        }));
      };
      socket.off("send_rejected", handleSendRejected).on("send_rejected", handleSendRejected);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("message_history", handleHistory);
        socket.off("message_received", handleMessage);
        socket.off("send_rejected", handleSendRejected);
        // socket.disconnect();
      };
    }
  }, [socket, chatInfo.connectionId, user?.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    if (!chatInfo.sendAllowed || !message.trim() || !socket?.connected) {
      setMessage("");
      return;
    }
    const payload = {
      text: message,
      connectionId: chatInfo.connectionId,
      senderUserId: user?.id,
      senderRole: showMessagingControls ? "admin" : "user",
      senderName: user?.name || "",
    };
    socket.emit("send_message", payload);
    setMessage("");
  };

  const toggleUserMessaging = async (closed) => {
    const cid = chatInfo.connectionId || connectionId;
    if (!showMessagingControls || !messagingBrand?.trim() || !cid) return;
    setMessagingActionLoading(true);
    try {
      const res = await httpFetch("/api/admin/conversations/messaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: cid,
          brand: messagingBrand.trim(),
          closed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refreshConnectionMeta();
      }
    } finally {
      setMessagingActionLoading(false);
    }
  };

  const submitReopenRequest = async () => {
    const cid = chatInfo.connectionId || connectionId;
    if (!cid || reopenSubmitting || hasReopenRequest) return;
    setReopenSubmitting(true);
    setReopenError("");
    try {
      const res = await httpFetch("/api/conversation/reopen-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: cid }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await refreshConnectionMeta();
      } else {
        setReopenError(data.error || "Could not send request. Try again.");
      }
    } finally {
      setReopenSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const content = (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg ${isEmbedded ? "h-full w-full" : "h-full w-full md:h-[500px] md:max-w-sm"}`}
    >
      <div
        className="sticky top-0 z-10 border-b border-border bg-muted-bg px-4 py-3"
        style={brandHeaderBg ? { backgroundColor: brandHeaderBg } : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${shouldUseBrandColors ? "" : "bg-highlight"}`}
              style={shouldUseBrandColors ? { backgroundColor: primaryHex } : undefined}
            >
              {(headerTitle || "U").charAt(0).toUpperCase()}
            </div>
            <div
              className={`py-2 text-lg font-semibold font-baloo ${isBrandUserInboxHeader ? "" : "uppercase"} ${shouldUseBrandColors ? "text-foreground" : "text-highlight"
                }`}
            >
              {headerTitle}
            </div>
            {showMessagingControls && conversationClosedForUser ? (
              <p className="text-xs text-muted">
                User cannot send messages until you reopen.
                {hasReopenRequest ? (
                  <span className="mt-1 block font-medium text-highlight">
                    User requested to chat again.
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {showMessagingControls && messagingBrand ? (
              <button
                type="button"
                disabled={messagingActionLoading || connectionLoading}
                onClick={() => toggleUserMessaging(!conversationClosedForUser)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted-bg disabled:opacity-50"
              >
                {conversationClosedForUser ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" aria-hidden />
                    Allow user
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    Close for user
                  </>
                )}
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-card"
              aria-label="Close Chat"
            >
              <X
                className={`h-4 w-4 ${shouldUseBrandColors ? "text-foreground/80 hover:text-foreground" : "text-highlight"
                  }`}
              />
            </button>
          </div>
        </div>
      </div>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-background p-2 scrollbar-none" ref={listRef}>
        {connectionLoading ? (
          <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted">
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="text-center py-2">
                  <span className="rounded-full bg-muted-bg px-3 py-1 text-xs text-muted">
                    {formatDate(date)}
                  </span>
                </div>
                {/* Messages for this date */}
                {msgs.map((m, i) => {
                  const isMe = m.senderUserId === user?.id;
                  const text = typeof m === "string" ? m : m.text;
                  const senderNameBase = isMe
                    ? user?.name || "You"
                    : (m?.senderRole === "admin" && m?.senderName
                      ? m.senderName
                      : displayName);
                  const senderName =
                    !isMe && m?.senderRole === "admin" && senderNameBase
                      ? `${senderNameBase} (Admin)`
                      : senderNameBase;
                  return (
                    <div key={`${date}-${i}`}>
                      <div className="flex gap-2 px-4 py-2">
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${shouldUseBrandColors ? "" : "bg-highlight"}`}
                          style={shouldUseBrandColors ? { backgroundColor: primaryHex } : undefined}
                        >
                          {(senderName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className={`font-baloo text-sm font-medium ${shouldUseBrandColors ? "text-foreground" : "text-highlight"
                              }`}
                          >
                            {senderName}
                          </p>
                          <p className="font-baloo text-xs text-muted">
                            {text}
                          </p>
                        </div>
                      </div>
                      {i !== msgs.length - 1 && (
                        <div className="h-[0.5px] w-full bg-border/60"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Message input or resolved + reopen request (blocked user) */}
      {isBlockedEndUser ? (
        <div className="w-full border-t border-border bg-muted-bg/60 px-4 py-4">
          <p className="font-baloo text-sm font-semibold text-foreground">
            This conversation has been resolved by admin.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            To start again, send a request — an admin can reopen this chat when
            they&apos;re ready.
          </p>
          {hasReopenRequest ? (
            <p
              className={`mt-3 text-xs font-medium ${shouldUseBrandColors ? "text-foreground" : "text-highlight"}`}
            >
              Your request was sent. You&apos;ll be able to message again once the
              admin reopens the conversation.
            </p>
          ) : (
            <>
              <button
                type="button"
                disabled={reopenSubmitting || connectionLoading}
                onClick={submitReopenRequest}
                className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${shouldUseBrandColors ? "" : "bg-highlight"}`}
                style={shouldUseBrandColors ? { backgroundColor: primaryHex } : undefined}
              >
                {reopenSubmitting ? "Sending request…" : "Request to chat again"}
              </button>
              {reopenError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                  {reopenError}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="w-full border-t border-border px-3 py-3 bg-card">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={connectionLoading || !chatInfo.sendAllowed}
              className="font-baloo w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground transition placeholder:text-muted focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={
                connectionLoading
                  ? "Loading..."
                  : !chatInfo.sendAllowed
                    ? "Messaging is closed"
                    : "Write a message..."
              }
            />
          </div>
          <div className="flex justify-end border-t border-border bg-card p-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              type="submit"
              disabled={
                connectionLoading || !chatInfo.sendAllowed || !message.trim()
              }
              className={`rounded-lg px-8 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted-bg disabled:text-muted-foreground ${shouldUseBrandColors ? "" : "bg-highlight"}`}
              style={shouldUseBrandColors ? { backgroundColor: primaryHex } : undefined}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center md:p-4">
      {content}
    </div>
  );
}
