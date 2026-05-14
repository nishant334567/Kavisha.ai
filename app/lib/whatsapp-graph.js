/**
 * WhatsApp Cloud API — outbound text via Graph API.
 * Env: WHATSAPP_ACCESS_TOKEN. Optional WHATSAPP_GRAPH_VERSION.
 */

const DEFAULT_GRAPH_VERSION = "v25.0";

/**
 * @param {{ to: string, body: string, phoneNumberId?: string }} params — `to` is customer wa_id (digits). `phoneNumberId` from Sanity / session (Graph send path).
 * @returns {Promise<{ ok: boolean, status?: number, data?: unknown, error?: string }>}
 */
export async function sendWhatsAppText({ to, body, phoneNumberId }) {
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim();
  const phoneNumberIdResolved = String(phoneNumberId ?? "").trim();
  const version =
    process.env.WHATSAPP_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;

  const toClean = String(to || "").replace(/\D/g, "");
  const text = String(body || "").trim().slice(0, 4096);

  if (!token || !phoneNumberIdResolved || !toClean || !text) {
    console.log(
      "[whatsapp] graph_send",
      JSON.stringify({
        ok: false,
        reason: "missing_config_or_params",
        hasToken: Boolean(token),
        hasPhoneNumberId: Boolean(phoneNumberIdResolved),
        hasTo: Boolean(toClean),
        hasText: Boolean(text),
      })
    );
    return { ok: false, error: "missing_config_or_params" };
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberIdResolved}/messages`;
  let res;
  let data;
  try {
    res = await fetch(url, {
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
    try {
      data = await res.json();
    } catch {
      data = {};
    }
  } catch (e) {
    console.log(
      "[whatsapp] graph_send",
      JSON.stringify({
        ok: false,
        reason: "fetch_failed",
        err: String(e?.message || e).slice(0, 200),
      })
    );
    return { ok: false, error: "fetch_failed", status: 0 };
  }

  let graphError;
  if (data && typeof data === "object" && data.error != null) {
    const err = data.error;
    graphError =
      typeof err === "object" && err != null && typeof err.message === "string"
        ? err.message
        : String(err);
  }

  /** Meta usually uses non-2xx on failure; treat any JSON `error` as failure even if HTTP is 2xx. */
  const ok = res.ok && !graphError;
  const wamid =
    data && typeof data === "object" && typeof data.messages?.[0]?.id === "string"
      ? data.messages[0].id
      : null;

  console.log(
    "[whatsapp] graph_send",
    JSON.stringify({
      ok,
      httpStatus: res.status,
      wamid: wamid || undefined,
      err: graphError || undefined,
    })
  );

  return {
    ok,
    status: res.status,
    data,
    ...(graphError ? { error: graphError } : {}),
  };
}

function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

/**
 * One pass over WhatsApp Cloud `messages` webhooks: business line ids + inbound text rows.
 * @returns {{
 *   displayDigits: string,
 *   graphPhoneNumberId: string,
 *   inbound: { from: string, body: string, id: string, displayName: string }[],
 * }}
 */
export function parseWhatsAppWebhook(body) {
  const empty = { displayDigits: "", graphPhoneNumberId: "", inbound: [] };
  if (!body || typeof body !== "object") return empty;
  const entry = body.entry;
  if (!Array.isArray(entry)) return empty;

  let displayDigits = "";
  let graphPhoneNumberId = "";
  const inbound = [];

  for (const ent of entry) {
    const changes = ent?.changes;
    if (!Array.isArray(changes)) continue;
    for (const ch of changes) {
      if (ch?.field !== "messages") continue;
      const value = ch?.value;
      const meta = value?.metadata;

      if (!graphPhoneNumberId && meta?.phone_number_id != null) {
        const g = String(meta.phone_number_id).replace(/\D/g, "");
        if (g) graphPhoneNumberId = g;
      }
      if (!displayDigits && meta?.display_phone_number != null) {
        const d = String(meta.display_phone_number).replace(/\D/g, "");
        if (d) displayDigits = d;
      }

      const names = new Map();
      for (const c of value?.contacts || []) {
        const wd = digits(c?.wa_id);
        const n = String(c?.profile?.name ?? "").trim();
        if (wd && n) names.set(wd, n);
      }

      const messages = value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const m of messages) {
        if (m?.type !== "text" || m?.text?.body == null) continue;
        const from = String(m.from || "");
        inbound.push({
          from,
          body: String(m.text.body || ""),
          id: String(m.id || ""),
          displayName: names.get(digits(from)) || "",
        });
      }
    }
  }

  return { displayDigits, graphPhoneNumberId, inbound };
}
