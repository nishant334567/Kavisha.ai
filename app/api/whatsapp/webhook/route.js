import { NextResponse } from "next/server";
import {
  extractInboundTextMessages,
  sendWhatsAppText,
} from "@/app/lib/whatsapp-graph";

/**
 * WhatsApp Cloud API — webhook verification (Meta sends this when you configure the callback URL).
 * Set `WHATSAPP_VERIFY_TOKEN` in env to the same string you enter in the Meta app dashboard.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && challenge && expected && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/** Inbound webhook: log payload, reply to text messages via Graph API when env is set. */
export async function POST(req) {
  try {
    const body = await req.json();
    const preview = JSON.stringify(body, null, 2);
    console.log(
      "[whatsapp webhook POST]",
      preview.length > 12_000 ? `${preview.slice(0, 12_000)}…(truncated)` : preview
    );

    const inbound = extractInboundTextMessages(body);
    for (const msg of inbound) {
      if (!msg.from) continue;
      const reply = `Echo: ${msg.body}`.slice(0, 4096);
      await sendWhatsAppText({ to: msg.from, body: reply });
    }
  } catch (e) {
    console.warn("[whatsapp webhook POST] non-JSON or parse error:", e?.message || e);
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
