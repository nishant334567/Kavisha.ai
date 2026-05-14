import { client } from "@/app/lib/sanity";

/** Match widget `whatsappCloudPhoneNumberId` / `whatsappPhoneNumberId` to webhook graph id / display digits. */
export async function getWhatsAppLeadBrandFromSanity({
  displayDigits = "",
  graphPhoneNumberId = "",
} = {}) {
  const d = String(displayDigits).replace(/\D/g, "");
  const g = String(graphPhoneNumberId).replace(/\D/g, "");
  if ((!d && !g) || !client) return null;

  const r = await client.fetch(
    `*[_type == "brand" && (
      ($g != "" && widgetLauncher.whatsappCloudPhoneNumberId == $g) ||
      ($d != "" && widgetLauncher.whatsappPhoneNumberId == $d)
    )][0]{
      "brand": lower(subdomain),
      "serviceKey": services[lower(name) == "lead_journey"][0]._key,
      "cloudPhoneNumberId": widgetLauncher.whatsappCloudPhoneNumberId
    }`,
    { d, g }
  );

  const brand = String(r?.brand || "").trim().toLowerCase();
  const sk = String(r?.serviceKey || "").trim();
  if (!brand || !sk) return null;

  const cloud = String(r?.cloudPhoneNumberId || "").replace(/\D/g, "");
  return {
    brand,
    serviceKey: sk,
    ...(cloud && { cloudPhoneNumberId: cloud }),
  };
}
