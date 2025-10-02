import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import { getToken } from "next-auth/jwt";
import { SYSTEM_PROMPT } from "../../lib/systemPrompt.js";
import getGeminiModel from "../../lib/getAiModel.js";
export async function POST(req){
    const {userMessage, history,sessionId, brand} = await req.json()
    const token =(process.env.NEXTAUTH_SECRET)? await getToken({
        req: req,
        secret: process.env.NEXTAUTH_SECRET,
      }):null;
    const model = getGeminiModel("gemini-2.5-pro");
    
    if (!model) {
        return NextResponse.json(
            { error: "AI model not available" },
            { status: 500 }
        );
    }
    
    const userMessageEmbedding = await generateEmbedding(userMessage);
    const formattedHistory = history.map(h => `${h.role}: ${h.message || h.text || ''}`).join('\n');
    
    if (userMessageEmbedding === 0) {
        return NextResponse.json(
            { error: "Failed to generate embedding" },
            { status: 500 }
        );
    }
    
    const index = pc.index("intelligent-kavisha").namespace(brand);
    const results = await index.query({
        vector: userMessageEmbedding,
        topK: 1,
        includeMetadata: true,
    });
    
    let context = "";
    if (results.matches && results.matches.length > 0) {
        context = results.matches.map(match => match.metadata?.text || "").join(" ");
    }
    console.log("context collected",context);
    const prompt = `You are an intelligent AI assistant specialized in providing accurate,
     helpful, and contextually relevant responses.

INSTRUCTIONS:
- Answer the user's question based on the provided context and conversation history
- Be concise but comprehensive - provide complete answers without unnecessary verbosity
- If you don't have specific information about something, respond naturally without mentioning technical limitations
- Maintain a helpful and professional tone
- Focus on being accurate rather than verbose
- Use plain text format - no markdown, asterisks, or special formatting
- Provide clean, readable responses suitable for API consumption
- Always sound natural and conversational, never mention "context" or "provided information" in your response

CONVERSATION HISTORY:
${formattedHistory}

RELEVANT CONTEXT:
${context}

USER QUESTION: ${userMessage}

Please provide a helpful response based on the above information:`;

    let geminiContents = [{
        role: "user",
        parts: [{ text: prompt + SYSTEM_PROMPT }],
    }];
    
    history.forEach((m) => {
        if (m.role === "user") {
          geminiContents.push({
            role: "user",
            parts: [{ text: m.message || "" }],
          });
        } else if (m.role === "assistant") {
          geminiContents.push({
            role: "model",
            parts: [{ text: m.message || "" }],
          });
        }
    });
  
    geminiContents.push({
        role: "user",
        parts: [{ text: userMessage || "" }],
    });

    try {
      const responseGemini = await model.generateContent({
        contents: geminiContents,
      });
      
      const responseText = responseGemini.response.candidates[0].content.parts[0].text;
      const reParts = responseText.split("////").map((item) => item.trim());
      
      //sve logs to the db
      await Logs.create({
        message: userMessage || "",
        sessionId: sessionId,
        userId: token.id,
        role: "user",
      });
      await Logs.create({
        message: reParts[0] || "",
        sessionId: sessionId,
        userId: token.id,
        role: "assistant",
      });
      if (reParts.length === 4) {
        return NextResponse.json({
          reply: reParts[0],
          summary: reParts[1],
          title: reParts[2],
          allDataCollected: reParts[3],
          matchesWithObjectIds: [],
        });
      } else {
        return NextResponse.json(
          { error: "Unexpected response format from AI model" },
          { status: 500 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to generate AI response", details: error.message },
        { status: 500 }
      );
    }
}