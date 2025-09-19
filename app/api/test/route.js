import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { createChatCompletion } from "@/app/utils/getAiResponse";

export async function POST(req) {
  await connectDB(); // connect mongoose once

  try {
    const { query, type, brand } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    const relavantSessions = await Session.find({
      $and: [
        ...(type ? [{ role: type }] : []),
        ...(brand ? [{ brand: brand }] : []),
      ],
    });

    // Use OpenAI to filter sessions based on query relevance - SINGLE API CALL
    const sessionsWithSummaries = relavantSessions
      .filter((session) => session.chatSummary)
      .map((session) => ({
        id: session._id,
        summary: session.chatSummary,
        role: session.role,
        brand: session.brand,
        user: session.user,
        status: session.status,
        allDataCollected: session.allDataCollected,
        createdAt: session.createdAt,
        resumeSummary: session.resumeSummary,
        resumeFilename: session.resumeFilename,
        title: session.title,
      }));

    if (sessionsWithSummaries.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
        total: 0,
        eligible: relavantSessions.length,
      });
    }

    try {
      const sessionsList = sessionsWithSummaries
        .map(
          (s, i) => `
[${i + 1}]
"id": "${s.id}"
"role": "${s.role}"
"brand": "${s.brand}"
"userName": "${s.user?.name || "Unknown"}"
"userEmail": "${s.user?.email || "No email"}"
"title": "${s.title || "No title"}"
"status": "${s.status || "Unknown"}"
"chatSummary": "${s.summary}"
"resumeSummary": "${s.resumeSummary || "No resume"}"
"allDataCollected": ${s.allDataCollected}
"createdAt": "${s.createdAt}"`
        )
        .join("\n");

      const prompt = `You are an expert job-matching AI with deep understanding of career compatibility and skill alignment.

TASK: Analyze the user's search query and find the most relevant chat sessions from the available candidates.

USER SEARCH QUERY:
"${query}"

AVAILABLE SESSIONS:
${sessionsList}

MATCHING CRITERIA:
1. **Query Relevance**: How well does the session content match the search intent
2. **Role Compatibility**: Job titles and career levels must align with query
3. **Skill Alignment**: Core skills and experience should match query requirements
4. **Industry Relevance**: Similar or complementary industries mentioned
5. **Experience Level**: Appropriate seniority match for the query
6. **Salary Expectations**: Reasonable alignment if salary is mentioned in query
7. **Location Preference**: Geographic compatibility if location is mentioned
8. **Work Mode**: Remote/hybrid/onsite preferences if mentioned in query

SCORING GUIDELINES:
- 90-100%: Perfect match across all criteria
- 80-89%: Strong match with minor gaps
- 70-79%: Good match with some concerns
- 60-69%: Moderate match with significant gaps
- Below 60%: Poor match, skip entirely

OUTPUT FORMAT:
Return a JSON array of matching sessions. Each match must include:

{
  "id": "session_id_here",
  "role": "job_seeker/recruiter/etc",
  "brand": "brand_name",
  "userName": "User Name",
  "userEmail": "user@email.com",
  "title": "Job Title or Role",
  "status": "session_status",
  "chatSummary": "Brief summary of their profile",
  "resumeSummary": "Resume summary if available",
  "allDataCollected": true/false,
  "createdAt": "creation_date",
  "relevanceScore": "85%",
  "matchingReason": "Detailed explanation of why this matches the query",
  "keyHighlights": "Key points that make this session relevant"
}

IMPORTANT:
- Only return sessions with 60%+ relevance to the query
- Be specific and detailed in your reasoning
- Focus on concrete, actionable insights
- Return only valid JSON array, no additional text
- If no sessions match, return an empty array []`;

      const completion = await createChatCompletion(
        "gpt-4o-mini",
        [
          {
            role: "system",
            content:
              "You are a smart job-matching assistant with expertise in career compatibility analysis.",
          },
          { role: "user", content: prompt },
        ],
        0.3,
        3000
      );

      const response = completion.choices[0].message.content.trim();

      // Parse the JSON response
      let matchingSessions = [];
      try {
        matchingSessions = JSON.parse(response);
        // Ensure it's an array
        if (!Array.isArray(matchingSessions)) {
          matchingSessions = [];
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // If parsing fails, return all sessions as fallback
        matchingSessions = sessionsWithSummaries;
      }

      return NextResponse.json({
        success: true,
        matches: matchingSessions,
        total: matchingSessions.length,
        eligible: relavantSessions.length,
      });
    } catch (error) {
      console.error("Error processing sessions with AI:", error);
      // If AI fails, return all sessions as fallback
      return NextResponse.json({
        success: true,
        matches: sessionsWithSummaries,
        total: sessionsWithSummaries.length,
        eligible: relavantSessions.length,
      });
    }
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch admin data",
      error: error.message,
    });
  }
}
