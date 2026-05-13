import { client } from "./sanity";

/**
 * @param {string} brandSubdomain
 * @returns {Promise<string|null>}
 */
export async function getSupportSlackWebhookUrl(brandSubdomain) {
  const b = String(brandSubdomain || "").trim().toLowerCase();
  if (!b || !client) return null;
  const url = await client.fetch(
    `*[_type == "brand" && subdomain == $b][0].supportChannels.slackWebhookUrl`,
    { b }
  );
  const s = typeof url === "string" ? url.trim() : "";
  return s || null;
}

/**
 * @param {{ webhookUrl: string; text: string }} p
 */
export async function postSlackIncomingWebhook({ webhookUrl, text }) {
  const u = String(webhookUrl || "").trim();
  const t = String(text || "").trim();
  if (!u || !t) return;
  const res = await fetch(u, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: t }),
  });
  if (!res.ok) {
    console.warn("[slack support]", res.status, await res.text().catch(() => ""));
  }
}
