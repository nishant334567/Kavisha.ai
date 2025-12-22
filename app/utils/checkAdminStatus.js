import { client } from "@/app/lib/sanity";
export async function checkAdminStatus(brand, userEmail) {
  try {
    if (!brand && !userEmail) {
      return false;
    }

    const brandDoc = await client.fetch(
      `*[_type=="brand" && subdomain ==$brand][0]{admins}`,
      { brand }
    );
    return (
      Array.isArray(brandDoc?.admins) && brandDoc.admins.includes(userEmail)
    );
  } catch (error) {
    // console.error("Error checking admin status:", error);
    return false;
  }
}
