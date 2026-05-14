import { NextResponse } from "next/server";
import { parseWhatsAppWebhook } from "@/app/lib/whatsapp-graph";
import { ensureWhatsAppLeadUserSession } from "@/app/lib/ensureWhatsAppLeadUserSession";
import { sendWhatsAppLeadJourneyReply } from "@/app/lib/whatsappLeadReply";
import { getWhatsAppLeadBrandFromSanity } from "@/app/lib/getWhatsAppLeadBrandFromSanity";

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

/** Inbound webhook: reply to text messages via Graph API when env is set. */
export async function POST(req) {
    try {
        const body = await req.json();
        const { displayDigits, graphPhoneNumberId, inbound } = parseWhatsAppWebhook(body);
        console.log(
            "[whatsapp] inbound",
            JSON.stringify({ displayDigits, graphPhoneNumberId, inbound })
        );

        const resolved =
            displayDigits || graphPhoneNumberId
                ? await getWhatsAppLeadBrandFromSanity({
                    displayDigits,
                    graphPhoneNumberId,
                })
                : null;

        console.log(
            "[whatsapp] resolved",
            JSON.stringify(
                resolved
                    ? {
                        brand: resolved.brand,
                        hasServiceKey: Boolean(String(resolved.serviceKey || "").trim()),
                        hasCloudPhoneNumberId: Boolean(
                            String(resolved.cloudPhoneNumberId || "").trim()
                        ),
                    }
                    : null
            )
        );

        const lineSendId = resolved
            ? String(resolved.cloudPhoneNumberId || graphPhoneNumberId || "").replace(/\D/g, "")
            : "";

        for (const msg of inbound) {
            if (!msg.from) continue;
            const ctx = await ensureWhatsAppLeadUserSession(msg.from, {
                displayName: msg.displayName,
                ...(resolved && {
                    brand: resolved.brand,
                    serviceKey: resolved.serviceKey,
                    ...(lineSendId ? { cloudPhoneNumberId: lineSendId } : {}),
                }),
            });
            if (!ctx) {
                console.log(
                    "[whatsapp] skip_reply",
                    JSON.stringify({ reason: "no_session_context", from: msg.from })
                );
                continue;
            }
            await sendWhatsAppLeadJourneyReply(msg, ctx);
        }
    } catch (e) {
        return NextResponse.json(
            { ok: false, error: String(e?.message || e) },
            { status: 500 }
        );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
}
