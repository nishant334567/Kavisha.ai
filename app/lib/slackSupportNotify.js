import { getBrandBySubdomain } from "./brandRepository";

export async function getSupportSlackWebhookUrl(brandSubdomain) {
  const doc = await getBrandBySubdomain(brandSubdomain);
  const s = String(doc?.supportChannels?.slackWebhookUrl || "").trim();
  return s || null;
}

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
