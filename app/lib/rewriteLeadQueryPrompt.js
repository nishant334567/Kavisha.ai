export function buildLeadRewritePrompt(formattedHistory, userMessage) {
  return `
You are a query rewriter and intent detector for a RAG system.

**GOAL:**
1. Rewrite the user's message into a better search query if needed
2. Detect if the user wants to change intent (switch to community features)

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

**INTENT DETECTION RULES:**
Determine if the user wants to switch from the current avatar conversation to a different intent.

**changeIntent: false** - Keep current avatar conversation when:
- User is continuing the conversation about general topics, personal stories, advice, or experiences
- User is asking follow-up questions about the avatar's background, journey, or opinions
- User is seeking information or guidance within the current discussion context
- User is engaging in casual conversation or small talk
- **Intent name**: "chat_with_avatar"

**changeIntent: true** - Switch intent when user expresses interest in:
- **Community onboarding** (intent: "community_onboarding"): 
  - Joining the community
  - Finding friends in the community
  - Looking for jobs or job opportunities
  - Hiring or recruiting
  - Community interactions or networking
  - Any community-related activities
  
- **Personal call** (intent: "personal_call"):
  - Requesting a one-on-one call with the actual persona behind the avatar
  - Wanting to speak directly with the person
  - Scheduling a call or meeting
  - Expressing interest in direct communication
  - Asking "can I talk to you?", "can we schedule a call?", "I want to speak with you directly"

**OUTPUT FORMAT:**
Return a JSON object with this structure:
{
  "changeIntent": true or false,
  "intent": "chat_with_avatar" | "community_onboarding" | "personal_call",
  "requery": "the rewritten query string (or empty string if closing)"
}

**EXAMPLES:**

Conversation:
user: "any advice from Rakesh Jhunjhunwala to you?"
assistant: "He told me to hold onto truly great companies forever."
user: "anything more?"
→ {"changeIntent": false, "intent": "chat_with_avatar", "requery": "any more advice that Rakesh Jhunjhunwala personally gave you?"}

Conversation:
user: "why didn't you become as big as linkedin?"
assistant: "Because LinkedIn had a stronger global network effect..."
user: "why?"
→ {"changeIntent": false, "intent": "chat_with_avatar", "requery": "why didn't Naukri become as big as LinkedIn?"}

Conversation:
user: "tell me your journey into investing"
assistant: "I started when I was 18..."
user: "tell me more"
→ {"changeIntent": false, "intent": "chat_with_avatar", "requery": "tell me more about your journey into investing"}

Conversation:
user: "how do I start investing with 10k per month?"
assistant: "You can start with mutual funds..."
user: "what about taxes?"
→ {"changeIntent": false, "intent": "chat_with_avatar", "requery": "what about taxes when starting to invest 10k per month in mutual funds?"}

Conversation:
user: "I want to join the community"
→ {"changeIntent": true, "intent": "community_onboarding", "requery": "I want to join the community"}

Conversation:
user: "Can you help me find a job?"
→ {"changeIntent": true, "intent": "community_onboarding", "requery": "Can you help me find a job?"}

Conversation:
user: "I'm looking for friends in the community"
→ {"changeIntent": true, "intent": "community_onboarding", "requery": "I'm looking for friends in the community"}

Conversation:
user: "I need to hire someone"
→ {"changeIntent": true, "intent": "community_onboarding", "requery": "I need to hire someone"}

Conversation:
user: "Can I schedule a call with you?"
→ {"changeIntent": true, "intent": "personal_call", "requery": "Can I schedule a call with you?"}

Conversation:
user: "I'd like to speak directly with the person behind this avatar"
→ {"changeIntent": true, "intent": "personal_call", "requery": "I'd like to speak directly with the person behind this avatar"}

Conversation:
user: "how do I start investing?"
assistant: "..."
user: "thanks, that's all"
→ {"changeIntent": false, "intent": "chat_with_avatar", "requery": ""}

**Now apply the same logic:**

Conversation:
${formattedHistory}

User message: "${userMessage}"

Return ONLY the JSON object:`.trim();
}
