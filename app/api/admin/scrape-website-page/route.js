import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { scrapeSinglePage } from "@/app/lib/agenticScraper";
import { parseAndValidateScrapeUrl } from "@/app/lib/scrapeWebsiteUrl";
import {
  prepareContentForTraining,
  resolveDocumentTitle,
} from "@/app/lib/websiteScrapeContent";

export const maxDuration = 120;

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const { url, brand, label, seedUrl } = body;

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

        const page = await scrapeSinglePage(parsed.href);
        const sourceUrl = page.url || parsed.href;
        const title = resolveDocumentTitle({
          label,
          url: parsed.href,
          pageTitle: page.title,
        });
        const content = prepareContentForTraining(page.content, {
          sourceUrl,
          seedUrl: seedUrl || parsed.href,
        });

        return NextResponse.json({
          success: true,
          page: {
            url: parsed.href,
            title,
            pageTitle: page.title,
            summary: page.summary,
            content,
            substantive: page.substantive,
            sourceUrl,
          },
        });
      } catch (error) {
        console.error("[admin/scrape-website-page]", error);
        return NextResponse.json(
          { error: error?.message || "Page scrape failed" },
          { status: 500 }
        );
      }
    },
  });
}
