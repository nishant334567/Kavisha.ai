import { connectDB } from "@/app/lib/db";
import KnowledgeFolder from "@/app/models/KnowledgeFolder";
import { websiteFolderNameFromUrl } from "@/app/lib/websiteScrapeContent";

/**
 * Find or create a folder for a website import session.
 * @param {string} brand
 * @param {string} seedUrl
 */
export async function ensureWebsiteFolder(brand, seedUrl) {
  const name = websiteFolderNameFromUrl(seedUrl);
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
