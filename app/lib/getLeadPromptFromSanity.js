import { client } from "@/app/lib/sanity";

/**
 * Fetches the lead-journey service prompt from Sanity by brand (subdomain) and serviceKey.
 * Returns a string built from the service's about, behaviour, and rules.
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
          about,
          behaviour,
          rules
        }
      }`,
      { brand: String(brand).trim(), serviceKey: String(serviceKey).trim() }
    );

    const service = data?.service;
    if (!service) return "";

    const parts = [];
    if (service.about?.trim()) parts.push(`About the person you represent (real world): ${service.about.trim()}`);
    if (service.behaviour?.trim()) parts.push(`How to behave as the avatar: ${service.behaviour.trim()}`);
    if (service.rules?.trim()) parts.push(`Some special rules to follow: ${service.rules.trim()}`);


    return parts.length > 0 ? parts.join(". ") + " " : "";
  } catch (error) {
    return "";
  }
}
