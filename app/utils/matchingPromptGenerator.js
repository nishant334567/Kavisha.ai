// app/utils/matchingPromptGenerator.js
export default function generateMatchingPrompt({
  sessionId,
  sessionSummary,
  allProvidersList,
}) {
  return `You are an expert job-matching AI with deep understanding of career compatibility and skill alignment.

TASK: Analyze and match job seekers with recruiters (or vice versa) based on their detailed profiles and requirements.

USER PROFILE [A]:
Requirements Summary:
---
${sessionSummary}
---

POTENTIAL MATCHES [B]:
${allProvidersList}
---

MATCHING CRITERIA (ALL MUST BE MET):
1. **STRICT ROLE COMPATIBILITY**: Job titles must be in the SAME or DIRECTLY RELATED field/industry
   - Musicians should only match with music/entertainment roles
   - Tech roles should only match with tech positions
   - Finance roles should only match with finance/business positions
   - NO cross-industry matches (e.g., musician ≠ research intern, developer ≠ marketing intern)
2. **SKILL ALIGNMENT**: Core skills and experience must overlap significantly (70%+)
3. **INDUSTRY RELEVANCE**: Must be in the SAME industry or directly complementary
4. **EXPERIENCE LEVEL**: Must be appropriate seniority match (no interns for senior roles, no senior roles for interns)
5. **CAREER PROGRESSION**: Role should make sense for the person's career path
6. **Location Preference**: Geographic compatibility (if mentioned)
7. **Salary Expectations**: Reasonable alignment (if mentioned)

STRICT FILTERING RULES:
- REJECT any match where roles are in completely different industries
- REJECT any match where experience levels are vastly different (intern vs senior)
- REJECT any match where the role doesn't align with the person's career trajectory
- ONLY consider matches where there's genuine professional relevance

SCORING GUIDELINES:
- 90-100%: Perfect match across all criteria with same industry
- 80-89%: Strong match with same industry, minor gaps
- 70-79%: Good match with same industry, some concerns
- 60-69%: Moderate match with same industry, significant gaps
- Below 60%: Poor match, skip entirely

OUTPUT FORMAT:
Return a JSON array of matches. Each match must include:

{
  "sessionId": "${sessionId}",
  "matchedUserId": "user_id_here",
  "matchedSessionId": "session_id_here", 
  "title": "Job Title or Role",
  "chatSummary": "Brief summary of their profile",
  "matchingReason": "Detailed explanation of why this is a good match",
  "matchPercentage": "85%",
  "mismatchReason": "Any concerns or gaps to address"
}

SAMPLE OUTPUT:
[
  {
    "sessionId": "${sessionId}",
    "matchedUserId": "user123",
    "matchedSessionId": "session456",
    "title": "Senior React Developer",
    "chatSummary": "Looking for a senior React developer with 5+ years experience, TypeScript, and team lead experience. Budget: $120k-150k, Remote work preferred.",
    "matchingReason": "Perfect match! User has 6 years React experience, strong TypeScript skills, and previous team lead experience. Salary expectations align well with budget range. Remote work preference matches perfectly.",
    "matchPercentage": "95%",
    "mismatchReason": "None - this is an excellent match"
  },
  {
    "sessionId": "${sessionId}",
    "matchedUserId": "user789",
    "matchedSessionId": "session101",
    "title": "Full Stack Developer",
    "chatSummary": "Seeking a full-stack developer with React and Node.js experience. 3-4 years experience required. Budget: $80k-100k, Hybrid work.",
    "matchingReason": "Good match with strong technical alignment. User has solid React and Node.js experience. Experience level is appropriate for the role.",
    "matchPercentage": "78%",
    "mismatchReason": "Salary expectations are slightly below user's range, and user prefers remote work while role is hybrid"
  }
]

CRITICAL IMPORTANT RULES:
- ONLY return matches with 60%+ compatibility AND same industry
- REJECT cross-industry matches completely (musician ≠ research intern, developer ≠ marketing intern)
- REJECT inappropriate experience level matches (intern ≠ senior role)
- Be extremely strict about role relevance - better to return fewer high-quality matches
- Be specific and detailed in your reasoning
- Address the user as "you" in explanations
- Focus on concrete, actionable insights
- Return only valid JSON array, no additional text
- If no relevant matches exist, return an empty array []`;
}
