import { getWhatsAppLeadBrand } from "@/app/lib/brandRepository";

/** @deprecated Use getWhatsAppLeadBrand from brandRepository */
export async function getWhatsAppLeadBrandFromSanity(params) {
  return getWhatsAppLeadBrand(params);
}
