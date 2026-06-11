/** Max starter prompts shown for lead-journey chats (main app + widget). */
export const MAX_INTRO_SUGGESTED_QUESTIONS = 5;

export function isLeadJourneyChatType(chatType) {
  return String(chatType || "").toLowerCase() === "lead_journey";
}

export function normalizeSuggestedQuestions(questions) {
  return (questions || []).map((q) => String(q).trim()).filter(Boolean);
}

export function getServiceIntroQuestions(
  brandContext,
  serviceKey,
  limit = MAX_INTRO_SUGGESTED_QUESTIONS,
) {
  const raw =
    brandContext?.services?.find((s) => s._key === serviceKey)?.introquestions ||
    [];
  return normalizeSuggestedQuestions(raw).slice(0, limit);
}

/** Whether to render the suggested-questions block (main chat). */
export function shouldShowIntroSuggestedQuestions({
  chatType,
  messages,
  messageLoading,
}) {
  return (
    isLeadJourneyChatType(chatType) &&
    (messages?.length ?? 0) <= 1 &&
    !messageLoading
  );
}

/** Whether the chat is still on the intro-only screen (scroll-to-top behavior). */
export function isIntroChatWithSuggestions({
  chatType,
  messages,
  messageLoading,
}) {
  return (
    shouldShowIntroSuggestedQuestions({ chatType, messages, messageLoading }) &&
    !(messages || []).some((m) => m.role === "user")
  );
}
