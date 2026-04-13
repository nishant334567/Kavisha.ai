"use client";

import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { hexToRgba } from "@/app/lib/brandTheme";

/** Preset title + subtitle for common widget loading phases (import and spread into {@link WidgetChatLoader}). */
export const WIDGET_LOADER_MESSAGES = {
  checkingSession: {
    title: "Checking your session",
    subtitle:
      "A quick, secure sign-in check keeps this chat private to you.",
  },
  loadingConversations: {
    title: "Loading your conversations",
    subtitle: "Fetching your chats for this brand's assistant.",
  },
  preparingAssistant: {
    title: "Preparing your assistant",
    subtitle: "Loading how this AI can help you — just a second.",
  },
  startingChat: {
    title: "Starting your chat",
    subtitle: "Opening a fresh conversation you can use right away.",
  },
  connectingSession: {
    title: "Connecting to your chat",
    subtitle: "Syncing this conversation and assistant settings.",
  },
  loadingMessages: {
    title: "Loading messages",
    subtitle: "Bringing in this thread so you see the full picture.",
  },
  default: {
    title: "Almost ready",
    subtitle: "Hang tight — your chat will appear in a moment.",
  },
};

/**
 * Pick loader copy from widget loading flags (first matching phase wins).
 * Use when you want the same messaging as {@link ChatBoxWidget} or to branch on `logsLoading` only:
 *
 * `const copy = widgetLoaderMessagesFromFlags({ ..., logsLoading: true });`
 * `<WidgetChatLoader primaryHex={hex} {...copy} />`
 *
 * @param {object} flags
 * @param {boolean} [flags.sessionsLoading]
 * @param {boolean} [flags.servicePickerOpen]
 * @param {boolean} [flags.leadJourneysLoading]
 * @param {boolean} [flags.newChatLoading]
 * @param {string | null} [flags.activeSessionId]
 * @param {boolean} [flags.sessionLoading]
 * @param {string | null} [flags.chatRole]
 * @param {boolean} [flags.logsLoading]
 * @param {string} [flags.leadJourneyRole]
 * @returns {{ title: string, subtitle: string }}
 */
export function widgetLoaderMessagesFromFlags(flags) {
  const {
    sessionsLoading = false,
    servicePickerOpen = false,
    leadJourneysLoading = false,
    newChatLoading = false,
    activeSessionId = null,
    sessionLoading = false,
    chatRole = null,
    logsLoading = false,
    leadJourneyRole = "lead_journey",
  } = flags;

  if (sessionsLoading) return WIDGET_LOADER_MESSAGES.loadingConversations;
  if (!servicePickerOpen && leadJourneysLoading)
    return WIDGET_LOADER_MESSAGES.preparingAssistant;
  if (newChatLoading) return WIDGET_LOADER_MESSAGES.startingChat;
  if (activeSessionId && sessionLoading)
    return WIDGET_LOADER_MESSAGES.connectingSession;
  if (
    activeSessionId &&
    chatRole === leadJourneyRole &&
    logsLoading
  ) {
    return WIDGET_LOADER_MESSAGES.loadingMessages;
  }
  return WIDGET_LOADER_MESSAGES.default;
}

/**
 * Centered, on-brand loading panel for the embed widget.
 * Use whenever you need a full-area loader (e.g. auth, session list, messages).
 *
 * @param {object} props
 * @param {string | null} [props.primaryHex] — Brand primary color (normalized hex) for accents
 * @param {string} props.title — Short heading
 * @param {string} props.subtitle — Supporting line
 * @param {string} [props.className] — Extra classes on the outer wrapper
 */
export default function WidgetChatLoader({
  primaryHex = null,
  title,
  subtitle,
  className = "",
}) {
  const iconWrapStyle = primaryHex
    ? {
        boxShadow: `0 0 0 1px ${hexToRgba(primaryHex, 0.22) || "rgba(0,0,0,0.08)"}, 0 12px 40px -16px ${hexToRgba(primaryHex, 0.35) || "rgba(0,0,0,0.15)"}`,
      }
    : undefined;

  return (
    <div
      className={`flex min-h-[min(100%,320px)] flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <div
          className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-muted-bg/60 via-transparent to-muted-bg/40 opacity-80 blur-xl dark:from-muted-bg/30 dark:to-transparent"
          aria-hidden
        />
        <div
          className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl border border-border/45 bg-card/95 shadow-md backdrop-blur-sm dark:border-border/35 dark:bg-card/85"
          style={iconWrapStyle}
        >
          <MessageCircle
            className="h-9 w-9 text-foreground/85 dark:text-foreground/90"
            style={primaryHex ? { color: primaryHex } : undefined}
            strokeWidth={1.35}
            aria-hidden
          />
          <Sparkles
            className="absolute -right-0.5 -top-0.5 h-4 w-4 text-amber-500/90 dark:text-amber-400/90"
            strokeWidth={2}
            aria-hidden
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          style={primaryHex ? { color: primaryHex } : undefined}
          strokeWidth={2}
          aria-hidden
        />
        <div className="max-w-[17rem] space-y-1.5">
          <p className="text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground">
            {title}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
