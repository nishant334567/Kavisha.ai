/**
 * WhatsApp Cloud API — outbound text via Graph API.
 * Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Optional: WHATSAPP_GRAPH_VERSION (default v21.0)
 */

const DEFAULT_GRAPH_VERSION = "v25.0";

/**
 * @param {{ to: string, body: string }} params — `to` is customer wa_id (digits)
 * @returns {Promise<{ ok: boolean, status?: number, data?: unknown, error?: string }>}
 */
export async function sendWhatsAppText({ to, body }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version =
    process.env.WHATSAPP_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;

  const toClean = String(to || "").replace(/\D/g, "");
  const text = String(body || "").trim().slice(0, 4096);

  if (!token || !phoneNumberId || !toClean || !text) {
    console.warn("[whatsapp send] missing WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, to, or body");
    return { ok: false, error: "missing_config_or_params" };
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toClean,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  console.log("[whatsapp send] Graph API", res.status, JSON.stringify(data));

  return { ok: res.ok, status: res.status, data };
}

function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

/** @returns {{ from: string, body: string, id: string, displayName: string }[]} */
export function extractInboundTextMessages(body) {
  if (!body || typeof body !== "object") return [];
  const entry = body.entry;
  if (!Array.isArray(entry)) return [];

  const out = [];
  for (const ent of entry) {
    const changes = ent?.changes;
    if (!Array.isArray(changes)) continue;
    for (const ch of changes) {
      if (ch?.field !== "messages") continue;
      const value = ch?.value;
      const messages = value?.messages;
      if (!Array.isArray(messages)) continue;

      const names = new Map();
      for (const c of value?.contacts || []) {
        const d = digits(c?.wa_id);
        const n = String(c?.profile?.name ?? "").trim();
        if (d && n) names.set(d, n);
      }

      for (const m of messages) {
        if (m?.type !== "text" || m?.text?.body == null) continue;
        const from = String(m.from || "");
        out.push({
          from,
          body: String(m.text.body || ""),
          id: String(m.id || ""),
          displayName: names.get(digits(from)) || "",
        });
      }
    }
  }
  return out;
}
