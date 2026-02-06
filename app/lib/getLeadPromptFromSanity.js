import { client } from "@/app/lib/sanity";

/**
 * Fetches the lead-journey service prompt from Sanity by brand (subdomain) and serviceKey.
 * Returns a string built from the service's intro and behaviour (same as client getServicePrompt).
 * @param {string} brand - Brand subdomain
 * @param {string} serviceKey - Service _key
 * @returns {Promise<string>} Prompt string or ""
 */
export async function getLeadPromptFromSanity(brand, serviceKey) {
  if (!brand || !serviceKey || !client) return "";

  try {
    const data = await client.fetch(
      `*[_type == "brand" && subdomain == $brand][0]{
        "service": services[_key == $serviceKey][0]{
          intro,
          behaviour
        }
      }`,
      { brand: String(brand).trim(), serviceKey: String(serviceKey).trim() }
    );

    const service = data?.service;
    if (!service) return "";

    const parts = [];
    if (service.intro) parts.push(`Introduction: ${service.intro}`);
    if (service.behaviour) parts.push(`Behaviour: ${service.behaviour}`);

    return parts.length > 0 ? parts.join(". ") + " " : "";
  } catch (error) {
    return "";
  }
}
