import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { scrapeSinglePage } from "@/app/lib/agenticScraper";
import { trainDocument } from "@/app/lib/trainDocument";
import { isSubstantiveContent } from "@/app/lib/scrapePageQuality";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";

export const maxDuration = 600;

const BATCH_DELAY_MS = 1500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyScrapeReason(message = "") {
  const m = String(message).toLowerCase();
  if (m.includes("timeout")) return "Page didn't load in time";
  if (m.includes("network") || m.includes("econnreset")) {
    return "Connection problem";
  }
  return message || "Could not load this page";
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { brand, urls, folderId } = body;

        if (!brand) {
          return NextResponse.json(
            { error: "Brand is required" },
            { status: 400 }
          );
        }

        if (!Array.isArray(urls) || urls.length === 0) {
          return NextResponse.json(
            { error: "Select at least one page to scrape" },
            { status: 400 }
          );
        }

        if (urls.length > 50) {
          return NextResponse.json(
            { error: "You can scrape at most 50 pages per batch" },
            { status: 400 }
          );
        }

        const admin = await isBrandAdmin(decodedToken.email, brand);
        if (!admin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const validated = [];
        for (const raw of urls) {
          const parsed = parseAndValidateScrapeUrl(raw);
          if (!parsed.ok) {
            return NextResponse.json(
              { error: parsed.error || "Invalid page URL" },
              { status: 400 }
            );
          }
          validated.push(parsed.href);
        }

        const uniqueUrls = [...new Set(validated)];
        const imported = [];
        const failed = [];
        let substantiveCount = 0;

        for (let i = 0; i < uniqueUrls.length; i++) {
          const pageUrl = uniqueUrls[i];
          try {
            const page = await scrapeSinglePage(pageUrl);
            const fullTitle = (page.title || "Untitled").trim();
            const title =
              fullTitle.length > 50 ? fullTitle.substring(0, 50) : fullTitle;

            const result = await trainDocument({
              brand,
              title,
              text: page.content,
              description: title,
              sourceUrl: page.url || pageUrl,
              ...(folderId && { folderId }),
            });

            const substantive = isSubstantiveContent(page.content);
            if (substantive) substantiveCount += 1;

            imported.push({
              title,
              docid: result.docid,
              chunkCount: result.chunkIds?.length || 0,
              sourceUrl: page.url || pageUrl,
              substantive,
            });
          } catch (e) {
            failed.push({
              sourceUrl: pageUrl,
              error: friendlyScrapeReason(e?.message),
            });
          }

          if (i < uniqueUrls.length - 1) {
            await delay(BATCH_DELAY_MS);
          }
        }

        if (imported.length === 0) {
          return NextResponse.json(
            {
              error: "No pages could be scraped and added to the knowledge base",
              failed,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Imported ${imported.length} page${imported.length === 1 ? "" : "s"} (${substantiveCount} with full main content) into your knowledge base`,
          imported,
          failed,
          scrapedCount: imported.length,
          substantiveCount,
          requestedCount: uniqueUrls.length,
        });
      } catch (error) {
        console.error("[admin/scrape-website-pages]", error);
        return NextResponse.json(
          { error: error?.message || "Website import failed" },
          { status: 500 }
        );
      }
    },
  });
}
