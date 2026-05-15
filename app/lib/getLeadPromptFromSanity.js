import { getLeadPrompt } from "@/app/lib/brandRepository";

/** @deprecated Use getLeadPrompt from brandRepository */
export async function getLeadPromptFromSanity(brand, serviceKey) {
  return getLeadPrompt(brand, serviceKey);
}
