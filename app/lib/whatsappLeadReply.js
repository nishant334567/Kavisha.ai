import { connectDB } from "./db.js";
import Logs from "../models/ChatLogs.js";
import Session from "../models/ChatSessions.js";
import { runLeadJourneyTurn } from "./runLeadJourneyTurn.js";
import { sendWhatsAppText } from "./whatsapp-graph.js";

/** Markdown-ish `**bold**` → WhatsApp `*bold*`; repeat until stable. */
function toWhatsAppSafeText(text) {
  let t = String(text || "").trim();
  if (!t) return t;
  let prev;
  do {
    prev = t;
    t = t.replace(/\*\*([^*]+)\*\*/g, "*$1*");
  } while (t !== prev);
  return t;
}

function sourcesAppendText(sourceUrls, sourceCards) {
  const cards = Array.isArray(sourceCards) ? sourceCards : [];
  const urls = Array.isArray(sourceUrls) ? sourceUrls : [];
  const lines = [];
  const seen = new Set();
  for (const c of cards) {
    const u = String(c?.url || "").trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    const t = String(c?.title || "").trim();
    lines.push(t ? `*${t}*\n${u}` : u);
  }
  for (const u of urls) {
    const s = String(u || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    lines.push(s);
  }
  if (!lines.length) return "";
  return `\n\n—\n*_Sources:_* ⬇️\n${lines.join("\n\n")}`;
}

/** Loads logs, runs `runLeadJourneyTurn`, sends WhatsApp text reply. */
export async function sendWhatsAppLeadJourneyReply(msg, ctx) {
  const userMessage = String(msg.body || "").trim();
  if (!userMessage) return;

  const brand = String(ctx.brand || "").trim();
  const serviceKey = String(ctx.serviceKey || "").trim();
  if (!brand || !serviceKey) return;

  await connectDB();

  const [session, logs] = await Promise.all([
    Session.findById(ctx.sessionId).select("chatSummary").lean(),
    Logs.find({ sessionId: ctx.sessionId })
      .sort({ createdAt: 1 })
      .select("role message")
      .lean(),
  ]);

  const history = [
    ...logs.map((r) => ({
      role: r.role,
      message: String(r.message || ""),
    })),
    { role: "user", message: userMessage },
  ];

  const result = await runLeadJourneyTurn({
    sessionId: ctx.sessionId,
    user: ctx.user,
    userMessage,
    history,
    brand,
    serviceKey,
    chatSummary: String(session?.chatSummary || "").trim(),
  });

  console.log(
    "[whatsapp] lead_turn",
    JSON.stringify({ ok: result.ok, stage: result.ok ? undefined : result.stage })
  );

  const body = result.ok
    ? toWhatsAppSafeText(String(result.payload?.reply || "").trim()) || "…"
    : "Sorry, something went wrong. Please try again shortly.";

  let out = body;
  if (result.ok) {
    const extra = sourcesAppendText(
      result.payload?.sourceUrls,
      result.payload?.sourceCards
    );
    if (extra) {
      const cap = 4096;
      if (body.length + extra.length <= cap) {
        out = body + extra;
      } else if (extra.length < cap) {
        out = body.slice(0, Math.max(0, cap - extra.length)) + extra;
      } else {
        out = (body + extra).slice(0, cap);
      }
    }
  }

  await sendWhatsAppText({
    to: msg.from,
    body: out.slice(0, 4096),
    phoneNumberId: ctx.cloudPhoneNumberId,
  });
}
