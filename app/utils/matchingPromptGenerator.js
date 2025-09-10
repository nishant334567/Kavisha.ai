// app/utils/matchingPromptGenerator.js
export default function generateMatchingPrompt({
  sessionId,
  role,
  sessionSummary,
  allProvidersList,
}) {
  return `You are an expert job-matching AI with deep understanding of career compatibility and skill alignment.

TASK: Analyze and match job seekers with recruiters (or vice versa) based on their detailed profiles and requirements.

USER PROFILE [A]:
Role: ${role}
Requirements Summary:
---
${sessionSummary}
---

POTENTIAL MATCHES [B]:
${allProvidersList}
---

MATCHING CRITERIA:
1. **Role Compatibility**: Job titles and career levels must align
2. **Skill Alignment**: Core skills and experience should overlap significantly
3. **Industry Relevance**: Similar or complementary industries
4. **Location Preference**: Geographic compatibility (if mentioned)
5. **Experience Level**: Appropriate seniority match
6. **Salary Expectations**: Reasonable alignment (if mentioned)

SCORING GUIDELINES:
- 90-100%: Perfect match across all criteria
- 80-89%: Strong match with minor gaps
- 70-79%: Good match with some concerns
- 60-69%: Moderate match with significant gaps
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

IMPORTANT:
- Only return matches with 60%+ compatibility
- Be specific and detailed in your reasoning
- Address the user as "you" in explanations
- Focus on concrete, actionable insights
- Return only valid JSON array, no additional text`;
}
