import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import {
    extractGeminiText,
    generateGeminiContentRest,
} from "@/app/lib/gemini-rest";

const MIN_USER_MESSAGES = 5;
const MAX_SUMMARY_CHARS = 120_000;

const SYSTEM_INSTRUCTION = `You analyze rolling chat summaries from a brand's lead-journey assistant.
Return ONLY valid JSON with this exact shape (no markdown fences):
{"keywords": string[], "topQueries": string[]}

Rules:
- keywords: 5–8 short topic labels (1–3 words each), Title Case, no duplicates, inferred only from the provided summaries.
- topQueries: up to 5 representative questions users likely asked, phrased as clear questions, grounded in the summaries. If unclear, use the closest paraphrase suggested by the text.
- Do not invent facts not supported by the summaries. If content is thin, return fewer items rather than guessing.
- keywords and topQueries must be in English unless the summaries are clearly in another language (then match that language).`;

export async function GET(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const { searchParams } = new URL(req.url);
                const brand = searchParams.get("brand");
                const fromDate = searchParams.get("fromDate");
                const toDate = searchParams.get("toDate");

                if (!brand || !fromDate || !toDate) {
                    return NextResponse.json(
                        { error: "Brand, fromDate and toDate are required" },
                        { status: 400 }
                    );
                }

                if (!(await isBrandAdmin(decodedToken.email, brand))) {
                    return NextResponse.json(
                        { error: "Forbidden - not a brand admin" },
                        { status: 403 }
                    );
                }

                const from = new Date(`${fromDate}T00:00:00.000Z`);
                const to = new Date(`${toDate}T23:59:59.999Z`);
                if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
                    return NextResponse.json(
                        { error: "Invalid fromDate/toDate" },
                        { status: 400 }
                    );
                }

                await connectDB();

                const activeSessions = await Logs.aggregate([
                    {
                        $match: {
                            role: "user",
                            createdAt: { $gte: from, $lte: to },
                        },
                    },
                    {
                        $lookup: {
                            from: "chatsessions",
                            localField: "sessionId",
                            foreignField: "_id",
                            as: "session",
                        },
                    },
                    { $unwind: "$session" },
                    {
                        $match: {
                            "session.brand": brand,
                            "session.role": "lead_journey",
                        },
                    },
                    {
                        $group: {
                            _id: "$sessionId",
                            userMessages: { $sum: 1 },
                        },
                    },
                    { $match: { userMessages: { $gt: MIN_USER_MESSAGES } } },
                ]);

                const sessionIds = activeSessions.map((r) => r._id);
                const eligibleSessionCount = sessionIds.length;

                const emptyMeta = {
                    eligibleSessionCount,
                    summariesUsed: 0,
                    summariesTruncated: false,
                };

                if (eligibleSessionCount === 0) {
                    return NextResponse.json({
                        keywords: [],
                        topQueries: [],
                        meta: emptyMeta,
                    });
                }

                const sessions = await Session.find({ _id: { $in: sessionIds } })
                    .sort({ updatedAt: -1 })
                    .select("chatSummary")
                    .lean();

                let bundleText = "";
                let summariesTruncated = false;
                let summariesUsed = 0;

                for (const s of sessions) {
                    const text = String(s.chatSummary || "").trim();
                    if (!text) continue;
                    const piece = `---\n${text}\n`;
                    if (bundleText.length + piece.length > MAX_SUMMARY_CHARS) {
                        summariesTruncated = true;
                        break;
                    }
                    bundleText += piece;
                    summariesUsed += 1;
                }

                if (!bundleText) {
                    return NextResponse.json({
                        keywords: [],
                        topQueries: [],
                        meta: emptyMeta,
                    });
                }

                const modelName =
                    process.env.AI_MODEL_ENGAGEMENT_INSIGHTS ||
                    process.env.AI_MODEL ||
                    "gemini-2.5-flash";

                const geminiResp = await generateGeminiContentRest({
                    modelName,
                    location: "global",
                    systemInstruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }],
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: `Summaries from active sessions (each block is one conversation summary):\n\n${bundleText}`,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: "application/json",
                    },
                });

                let parsed;
                try {
                    parsed = JSON.parse(extractGeminiText(geminiResp).trim());
                } catch {
                    return NextResponse.json(
                        { error: "Insights response could not be parsed" },
                        { status: 502 }
                    );
                }

                const keywords = Array.isArray(parsed.keywords)
                    ? parsed.keywords.slice(0, 8).map(String)
                    : [];
                const topQueries = Array.isArray(parsed.topQueries)
                    ? parsed.topQueries.slice(0, 5).map(String)
                    : [];

                return NextResponse.json({
                    keywords,
                    topQueries,
                    meta: {
                        eligibleSessionCount,
                        summariesUsed,
                        summariesTruncated,
                    },
                });
            } catch (error) {
                console.error("[engagement-insights]", error);
                return NextResponse.json(
                    { error: "Failed to generate engagement insights" },
                    { status: 500 }
                );
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
}
