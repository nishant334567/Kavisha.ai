import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { discoverSiteLinks } from "@/app/lib/agenticScraper";
import { discoverBlogLinks } from "@/app/lib/blogDiscovery";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";
import { dedupeDiscoveredLinks } from "@/app/lib/websiteScrapeContent";
import { ensureWebsiteFolder } from "@/app/lib/websiteFolder";
import { normalizeWebsiteImportMode } from "@/app/lib/websiteImportMode";

export const maxDuration = 180;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { url, brand, mode } = body;

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        const parsed = parseAndValidateScrapeUrl(url);
        if (!parsed.ok) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const importMode = normalizeWebsiteImportMode(mode);

        const result =
          importMode === "blog"
            ? await discoverBlogLinks(parsed.href)
            : await discoverSiteLinks(parsed.href);
        const links = dedupeDiscoveredLinks(result.links);
        const { folderId, folderName } = await ensureWebsiteFolder(
          brand,
          result.seedUrl || parsed.href,
          { importMode },
        );

        if (!links.length) {
          return NextResponse.json(
            {
              error:
                "No pages were found on this site. Check the URL or try again.",
            },
            { status: 422 }
          );
        }

        return NextResponse.json({
          success: true,
          ...result,
          links,
          total: links.length,
          folderId,
          folderName,
          mode: importMode,
        });
      } catch (error) {
        console.error("[admin/discover-website]", error);
        return NextResponse.json(
          { error: error?.message || "Link discovery failed" },
          { status: 500 }
        );
      }
    },
  });
}
