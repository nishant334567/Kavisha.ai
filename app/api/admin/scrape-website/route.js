import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { runAgenticScrape } from "@/app/lib/agenticScraper";
import { trainDocument } from "@/app/lib/trainDocument";
import { assessPagesForImport, isSubstantiveContent } from "@/app/lib/scrapePageQuality";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";

export const maxDuration = 600;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { url, brand } = body;

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

        const { pages } = await runAgenticScrape(parsed.href);

        if (pages.length === 0) {
          return NextResponse.json(
            {
              error:
                "No content was scraped from this URL. Try a different page or check the site allows browsing.",
            },
            { status: 422 }
          );
        }

        const quality = assessPagesForImport(pages);
        if (!quality.ok) {
          return NextResponse.json(
            {
              error: quality.message,
              scrapedCount: pages.length,
              hint: "Redeploy the agentic-scraper service if you recently updated it. The live scraper must include the latest formatting and crawl rules.",
            },
            { status: 422 }
          );
        }

        const imported = [];
        const failed = [];

        for (const page of pages) {
          const fullTitle = (page.title || "Untitled").trim();
          const title =
            fullTitle.length > 50 ? fullTitle.substring(0, 50) : fullTitle;
          try {
            const result = await trainDocument({
              brand,
              title,
              text: page.content,
              description: title,
              sourceUrl: page.url || parsed.href,
            });
            imported.push({
              title,
              docid: result.docid,
              chunkCount: result.chunkIds?.length || 0,
              sourceUrl: page.url,
              substantive: isSubstantiveContent(page.content),
            });
          } catch (e) {
            failed.push({
              title: fullTitle,
              sourceUrl: page.url,
              error: e?.message || "Training failed",
            });
          }
        }

        if (imported.length === 0) {
          return NextResponse.json(
            {
              error: "Scraped content could not be added to the knowledge base",
              failed,
            },
            { status: 500 }
          );
        }

        const substantiveImported = imported.filter((r) => r.substantive).length;

        return NextResponse.json({
          success: true,
          message: `Imported ${imported.length} page${imported.length === 1 ? "" : "s"} (${substantiveImported} with full main content) into your knowledge base`,
          imported,
          failed,
          scrapedCount: pages.length,
          substantiveCount: quality.substantiveCount,
        });
      } catch (error) {
        console.error("[admin/scrape-website]", error);
        return NextResponse.json(
          { error: error?.message || "Website import failed" },
          { status: 500 }
        );
      }
    },
  });
}
