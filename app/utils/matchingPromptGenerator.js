// app/utils/matchingPromptGenerator.js
export default function generateMatchingPrompt({
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

  "matchedSessionId": "session_id_from_providers_list", 
  "matchingReason": "Detailed explanation of why this is a good match",
  "matchPercentage": "85%",
  "mismatchReason": "Any concerns or gaps to address"
}

SAMPLE OUTPUT:
[
  {
    "matchedSessionId": "session456",
    "matchingReason": "Perfect match! User has 6 years React experience, strong TypeScript skills, and previous team lead experience. Salary expectations align well with budget range. Remote work preference matches perfectly.",
    "matchPercentage": "95%",
    "mismatchReason": "None - this is an excellent match"
  },
  {
    "matchedSessionId": "session101",
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

export function matchmakingPromptGenerator({
  sessionSummary,
  allProvidersList,
}) {
  return `You are an expert dating and relationship compatibility AI with deep understanding of personal preferences, values, and lifestyle compatibility.

TASK: Analyze and match individuals based on their dating preferences, personality traits, and relationship goals.

USER PROFILE [A]:
Dating Preferences Summary:
---
${sessionSummary}
---

POTENTIAL MATCHES [B]:
${allProvidersList}
---

MATCHING CRITERIA (SIMPLE APPROACH):
1. **BASIC REQUIREMENTS**: Profile must meet the stated requirements/preferences
2. **DEAL BREAKERS**: Must not violate any explicitly mentioned deal breakers
3. **AGE RANGE**: Must be within specified age range (if mentioned)
4. **LOCATION**: Must be in acceptable location range (if specified)
5. **RELATIONSHIP GOAL**: Must be compatible with stated relationship intentions

SIMPLE FILTERING RULES:
- MATCH if profile meets the basic requirements
- REJECT if profile violates any deal breakers
- REJECT if profile is clearly outside age range
- REJECT if profile is in incompatible location
- REJECT if relationship goals are completely opposite

SIMPLE SCORING:
- 80-100%: Good match - meets all basic requirements
- 60-79%: Decent match - meets most requirements with minor gaps
- Below 60%: Poor match - skip entirely

OUTPUT FORMAT:
Return a JSON array of matches. Each match must include:

{

  "matchedSessionId": "session_id_from_providers_list", 
  "matchingReason": "Detailed explanation of why this is a good romantic match",
  "matchPercentage": "85%",
  "mismatchReason": "Any concerns or areas that might need work"
}

SAMPLE OUTPUT:
[
  {
 
    "matchedSessionId": "session456",
    "matchingReason": "Excellent match! Both seeking serious relationships, share love for outdoor activities and nature. Similar values around family and career. Age and location are compatible. Both have stable careers and similar life stages.",
    "matchPercentage": "92%",
    "mismatchReason": "Minor difference in work schedules, but both are flexible"
  },
  {
    "matchedSessionId": "session101",
    "matchingReason": "Good potential match with shared interests in arts and culture. Both are creative and enjoy city life. Age is compatible and both are open to seeing where things go.",
    "matchPercentage": "78%",
    "mismatchReason": "Different relationship goals initially - one wants serious, other wants casual to start"
  }
]

SIMPLE RULES:
- ONLY return matches with 60%+ compatibility
- MATCH if profile meets basic requirements
- REJECT if profile violates deal breakers
- REJECT if profile is clearly out of bounds
- Keep reasoning simple and straightforward
- Return only valid JSON array, no additional text
- If no relevant matches exist, return an empty array []

CRITICAL: Use the EXACT sessionId values from the POTENTIAL MATCHES [B] list above.`;
}
