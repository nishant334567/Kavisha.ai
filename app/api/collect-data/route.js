import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { getBrandService } from "@/app/lib/brandRepository";
import getGeminiModel from "@/app/lib/getAiModel";

function buildPrompt(service, questions, frozenSummary) {
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const n = questions.length;
  let prompt = `Collect data for "${service.title || service.name}".
Return JSON only: {"reply":"","summary":"","title":"","allDataCollected":false,"onboardingPercent":0}

Questions (collect only these ${n}, in order):
${list}

Ask one listed question per reply. Do not invent other questions.
summary = collected answers only. title ≤20 chars.
allDataCollected = true when all answered. onboardingPercent = round(answered/${n}*100).`;

  if (service.behaviour) prompt += `\nTone: ${service.behaviour}`;
  if (service.initialMessage) prompt += `\nFirst turn greeting: ${service.initialMessage}`;
  if (frozenSummary) prompt += `\nKeep summary unless user updates: "${frozenSummary}"`;
  return prompt;
}

function parseAi(text) {
  const raw = JSON.parse(String(text || "").trim());
  const reply = String(raw.reply || "").trim();
  if (!reply) return null;

  const allDataCollected = raw.allDataCollected === true;
  let onboardingPercent = Math.round(Number(raw.onboardingPercent) || 0);
  onboardingPercent = Math.max(0, Math.min(100, onboardingPercent));
  if (allDataCollected) onboardingPercent = 100;

  return {
    reply,
    summary: String(raw.summary || "").trim(),
    title: String(raw.title || "Collect").slice(0, 20),
    allDataCollected,
    onboardingPercent,
  };
}

async function runTurn(model, contents) {
  const retry = {
    role: "user",
    parts: [
      {
        text: "Return valid JSON with: reply, summary, title, allDataCollected, onboardingPercent",
      },
    ],
  };

  for (let i = 0; i < 2; i++) {
    const res = await model.generateContent({
      contents: i === 0 ? contents : [...contents, retry],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: i === 0 ? 0.3 : 0,
      },
    });
    const text = res.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      const parsed = parseAi(text);
      if (parsed) return parsed;
    } catch {
      // retry once
    }
  }
  return null;
}

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const model = getGeminiModel("gemini-2.5-flash");
        if (!model) {
          return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        const { history = [], userMessage, sessionId } = await request.json();
        const user = await getUserFromDB(decodedToken.email);
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        await connectDB();

        const session = await Session.findById(sessionId).lean();
        if (!session || String(session.userId) !== String(user.id)) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const service = await getBrandService(session.brand, session.serviceKey);
        if (!service) {
          return NextResponse.json({ error: "Service not found" }, { status: 404 });
        }

        const questions = (service.collectQuestions || [])
          .map((q) => String(q ?? "").trim())
          .filter(Boolean);
        if (!questions.length) {
          return NextResponse.json(
            { error: "No questions configured for this service" },
            { status: 400 }
          );
        }

        const frozenSummary =
          session.allDataCollected && session.chatSummary ? session.chatSummary : "";

        const contents = [
          {
            role: "user",
            parts: [{ text: buildPrompt(service, questions, frozenSummary) }],
          },
        ];
        for (const m of history) {
          if (m.role === "user") {
            contents.push({ role: "user", parts: [{ text: m.message || "" }] });
          } else if (m.role === "assistant") {
            contents.push({ role: "model", parts: [{ text: m.message || "" }] });
          }
        }
        contents.push({ role: "user", parts: [{ text: userMessage || "" }] });

        const parsed = await runTurn(model, contents);
        if (!parsed) {
          return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
        }

        const { reply, summary, title, allDataCollected, onboardingPercent } = parsed;

        setImmediate(async () => {
          await Logs.create({
            message: userMessage || "",
            sessionId,
            userId: user.id,
            role: "user",
          });
          await Logs.create({
            message: reply,
            sessionId,
            userId: user.id,
            role: "assistant",
          });
          await Session.updateOne(
            { _id: sessionId },
            {
              $set: {
                chatSummary: summary,
                title,
                allDataCollected,
                onboardingPercent,
              },
            }
          );
        });

        return NextResponse.json({
          reply,
          summary,
          title,
          allDataCollected: allDataCollected ? "true" : "false",
          onboardingProgress: { percent: onboardingPercent },
        });
      } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    },
  });
}
