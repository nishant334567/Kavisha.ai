export function buildLeadRewritePrompt(formattedHistory, userMessage) {
  return `
You are a query rewriter for a RAG system.

**GOAL:** Rewrite the user's message into a better search query when needed.

**QUERY REWRITE RULES:**
- If the user's message is already clear and standalone, RETURN IT UNCHANGED
- If the message is a follow-up that depends on conversation history
  (e.g. "what?", "anything more?", "tell me more", "why?", "how about taxes?", "and then?"),
  REWRITE it into a full, explicit question using the MOST RECENT topic, person, or entity from the conversation
- If the message is clearly closing or small talk
  (e.g. "thanks", "thank you", "ok bye", "good night", "nice talking to you"),
  return an empty string: ""
- Do NOT introduce new topics or facts
- Do NOT answer the question

**OUTPUT FORMAT:**
Return a JSON object with this structure:
{
  "requery": "the rewritten query string (or empty string if closing)"
}

**EXAMPLES:**

Conversation:
user: "any advice from Rakesh Jhunjhunwala to you?"
assistant: "He told me to hold onto truly great companies forever."
user: "anything more?"
→ {"requery": "any more advice that Rakesh Jhunjhunwala personally gave you?"}

Conversation:
user: "why didn't you become as big as linkedin?"
assistant: "Because LinkedIn had a stronger global network effect..."
user: "why?"
→ {"requery": "why didn't Naukri become as big as LinkedIn?"}

Conversation:
user: "tell me your journey into investing"
assistant: "I started when I was 18..."
user: "tell me more"
→ {"requery": "tell me more about your journey into investing"}

Conversation:
user: "how do I start investing with 10k per month?"
assistant: "You can start with mutual funds..."
user: "what about taxes?"
→ {"requery": "what about taxes when starting to invest 10k per month in mutual funds?"}

Conversation:
user: "how do I start investing?"
assistant: "..."
user: "thanks, that's all"
→ {"requery": ""}

**Now apply the same logic:**

Conversation:
${formattedHistory}

User message: "${userMessage}"

Return ONLY the JSON object:`.trim();
}
