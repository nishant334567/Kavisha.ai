import { NextResponse } from "next/server";
import getGeminiModel from "../../lib/getAiModel.js";
import { SYSTEM_PROMPT_AVATAR } from "@/app/lib/systemPrompt.js";

const model = getGeminiModel("gemini-2.5-pro");

const STRICT_RETRY_PROMPT = `
⚠️ CRITICAL: Your previous response was invalid JSON and could not be parsed. ⚠️

You MUST retry and return ONLY valid JSON. Follow these rules STRICTLY:
- Return ONLY the JSON object, nothing else
- NO markdown code blocks (no \`\`\`json or \`\`\`)
- NO text before or after the JSON
- Start with { and end with }
- Ensure all strings are properly quoted
- Ensure all brackets and braces are properly closed
- The JSON must be directly parseable by JSON.parse()

RETRY NOW with valid JSON only.
`;

async function generateAvatarResponse(name, bio, isRetry = false) {
  const finalPrompt = `USER INFORMATION FOR THEIR AVATAR CREATION: 
    1.Name: ${name} \n 2.Bio shared: ${bio}. 
    Please provide a helpful response based on the above information:`;

  const systemPrompt = isRetry
    ? SYSTEM_PROMPT_AVATAR + STRICT_RETRY_PROMPT
    : SYSTEM_PROMPT_AVATAR;

  const geminiContents = [
    {
      role: "user",
      parts: [{ text: finalPrompt + systemPrompt }],
    },
  ];

  const responseGemini = await model.generateContent({
    contents: geminiContents,
    tools: [{ google_search: {} }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // Validate response structure
  if (!responseGemini?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return { error: "Invalid response from AI model", responseText: null };
  }

  let responseText =
    responseGemini.response.candidates[0].content.parts[0].text.trim();

  // Extract JSON - handle both raw JSON and markdown-wrapped JSON (fallback)
  let jsonString = responseText;

  // If wrapped in markdown code blocks, extract the JSON
  if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```(?:json)?\s*/i, "");
    jsonString = jsonString.replace(/\s*```$/i, "");
    jsonString = jsonString.trim();
  }

  // Try to parse the JSON
  try {
    const parsedData = JSON.parse(jsonString);
    return { success: true, data: parsedData, responseText };
  } catch (parseError) {
    return { error: "Failed to parse JSON", responseText };
  }
}

export async function POST(request) {
  try {
    const { name, bio } = await request.json();

    if (!name?.trim() || !bio?.trim()) {
      return NextResponse.json(
        { error: "Name and bio are required", success: false },
        { status: 400 }
      );
    }

    // First attempt
    let result = await generateAvatarResponse(name, bio, false);

    // If first attempt failed, retry once with stricter prompt
    if (!result.success) {
      result = await generateAvatarResponse(name, bio, true);
    }

    // If retry also failed, return error
    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "Failed to parse AI response as JSON after retry. Please try again.",
          success: false,
          rawResponse: result.responseText,
        },
        { status: 500 }
      );
    }

    // Success - return parsed data
    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create avatar", success: false },
      { status: 500 }
    );
  }
}
