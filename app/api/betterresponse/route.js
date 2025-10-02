import { NextResponse } from "next/server";
import { generateEmbedding } from "../../lib/embeddings.js";
import pc from "../../lib/pinecone.js";
import Logs from "../../models/ChatLogs.js";
import Session from "../../models/ChatSessions.js";
import { getToken } from "next-auth/jwt";
import { SYSTEM_PROMPT } from "../../lib/systemPrompt.js";
import getGeminiModel from "../../lib/getAiModel.js";
import { connectDB } from "../../lib/db.js";
export async function POST(req){
    const {userMessage, history,sessionId, brand, prompt} = await req.json()
    const token =(process.env.NEXTAUTH_SECRET)? await getToken({
        req: req,
        secret: process.env.NEXTAUTH_SECRET,
      }):null;
    
    await connectDB();
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
    
    let context = "";
    try {
        const index = pc.index("intelligent-kavisha").namespace(brand);
        const results = await index.query({
            vector: userMessageEmbedding,
            topK: 5, // Get top 5 matches
            includeMetadata: true,
            includeValues: false, // We don't need the actual vector values
        });
        console.log("results", results);
        if (results.matches && results.matches.length > 0) {
            // Filter matches by similarity score threshold (0.7 = 70% similarity)
            const SIMILARITY_THRESHOLD = 0.5;
            const relevantMatches = results.matches.filter(match => 
                match.score && match.score >= SIMILARITY_THRESHOLD
            );

            console.log(`Found ${results.matches.length} matches, ${relevantMatches.length} above threshold`);
            
            if (relevantMatches.length > 0) {
                context = relevantMatches.map(match => match.metadata?.text || "").join(" ");
            }
        }
    } catch (pineconeError) {
        console.error("Pinecone query failed:", pineconeError);
        // Continue without context if Pinecone fails
        context = "";
    }
    console.log("context collected",context);

    const finalPrompt = `${prompt}
CONVERSATION HISTORY:
${formattedHistory}

RELEVANT CONTEXT:
${context}

USER QUESTION: ${userMessage}

Please provide a helpful response based on the above information:`;

    let geminiContents = [{
        role: "user",
        parts: [{ text: finalPrompt +SYSTEM_PROMPT}],
    }];

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
        // Update session with summary, title, and data collection status
        await Session.updateOne(
          { _id: sessionId },
          {
            $set: {
              chatSummary: reParts[1],
              title: reParts[2],
              allDataCollected: reParts[3] === "true",
            },
          },
          { upsert: true }
        );
        
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