import { client as sanity } from "@/app/lib/sanity";

/**
 * Check if user is admin for a brand
 */
export async function isBrandAdmin(email, brand) {
  try {
    if (!email || !brand) return false;

    const brandDoc = await sanity.fetch(
      `*[_type=="brand" && subdomain==$brand][0]{admins}`,
      { brand }
    );
    return Array.isArray(brandDoc?.admins) && brandDoc.admins.includes(email);
  } catch (error) {
    return false;
  }
}
