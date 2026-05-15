import { isBrandAdmin } from "@/app/lib/brandRepository";

export async function checkAdminStatus(brand, userEmail) {
  try {
    if (!brand || !userEmail) return false;
    return isBrandAdmin(userEmail, brand);
  } catch {
    return false;
  }
}
