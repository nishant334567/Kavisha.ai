import { connectDB } from "@/app/lib/db";
import KnowledgeFolder from "@/app/models/KnowledgeFolder";
import { ecommerceFolderNameFromUrl } from "@/app/lib/ecommerceScrapeContent";
import { websiteFolderNameFromUrl } from "@/app/lib/websiteScrapeContent";
import { normalizeWebsiteImportMode } from "@/app/lib/websiteImportMode";

/**
 * Find or create a folder for a website import session.
 * @param {string} brand
 * @param {string} seedUrl
 * @param {{ importMode?: string }} [options]
 */
export async function ensureWebsiteFolder(brand, seedUrl, options = {}) {
  const mode = normalizeWebsiteImportMode(options.importMode);
  const name =
    mode === "ecommerce"
      ? ecommerceFolderNameFromUrl(seedUrl)
      : websiteFolderNameFromUrl(seedUrl);
  await connectDB();

  let folder = await KnowledgeFolder.findOne({ brand, name }).lean();
  if (!folder) {
    folder = await KnowledgeFolder.create({ brand, name });
  }

  return {
    folderId: String(folder._id),
    folderName: folder.name,
  };
}
